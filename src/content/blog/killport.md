---
title: "Adding Windows support to killport"
description: "How I added Windows support to the killport project"
pubDate: "05/10/2023"
---

This blog post covers what I learned and how I implemented Windows support for the killport project [Here](https://github.com/jkfran/killport)

The pull request these changes were made in [Reference Pull Request](https://github.com/jkfran/killport/pull/21)

## Intro 

While doing my late night scrolling through GitHub I stumbled upon this cool little project called [killport](https://github.com/jkfran/killport) in my GitHub Explore. I took a peek through the code and the README and though this looked like a cool project. I noticed that the project didn't support Windows so I jotted down a note
to begin working on it tomrrow.

> The killport project is a command line tool which allows you to kill any process that is using specific ports

## Getting started

Fast forward to the next day im ready to start the project. With my very little experience in working with the Windows API I first decided to browser the API docs in search of a function which could provide me a mapping between port numbers and process IDs. 

### Functions

The functions that I found for this were the following

- [GetExtendedTcpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable) Retrieves a table of TCP endpoints with the details about their owners
- [GetExtendedUdpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedudptable) Retrieves a table of UDP endpoints with the details about their owners
- [OpenProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-openprocess) Opens a handle to the process to allow terminating
- [TerminateProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-terminateprocess) Can terminate a process using its handle 

Now its time to implement the Rust code to interface with these functions

## Setting up the Rust

Now in order to use thse functions I will need to make use of the `windows-sys` crate to provide mappings for it so I added the crate along with the required feature flags for each of the functions.

```toml
[target.'cfg(target_os = "windows")'.dependencies.windows-sys]
version = "0.48"
features = [
  "Win32_Foundation",
  "Win32_NetworkManagement_IpHelper",
  "Win32_System_Threading",
  "Win32_Networking_WinSock",
]
```

I only add this dependency for the Windows platform as thats the only target that will make use of this dependency

## Implementation

Because the GetExtendedTcpTable and GetExtendedUdpTable need to provide a list of unknown size back to me after being called I need to do heap allocations for the API to store the structured data.


### Retrieving tables

The following code allocates a buffer for the Windows API to store the table in. The first call to 
`GetExtendedTcpTable` will fail as the initialize size is zero, After this first call fails the `size` 
variable will be changed to the size estimate from the function this change is detected because the 
call will return a result of `ERROR_INSUFFICIENT_BUFFER` when this is recieved the buffer memory can 
be reallocated to the new size estimate.


```rust

/// Reads the extended TCP table into memory using the provided address `family`
/// to determine the output type. Returns the memory pointer to the loaded struct
///
/// # Arguments
///
/// * `layout` - The layout of the memory
/// * `family` - The address family type
unsafe fn get_extended_tcp_table(layout: Layout, family: ADDRESS_FAMILY) -> Result<*mut u8, Error> {
    let mut buffer = std::alloc::alloc(layout);

    // Size estimate for resizing the buffer
    let mut size = 0;

    // Result of asking for the TCP table
    let mut result: u32;

    loop {
        // Ask windows for the extended TCP table mapping between TCP ports and PIDs
        result = GetExtendedTcpTable(
            buffer.cast(),
            &mut size,
            1,
            family as u32,
            TCP_TABLE_OWNER_MODULE_ALL,
            0,
        );

        // No error occurred
        if result == NO_ERROR {
            break;
        }

        // Handle buffer too small
        if result == ERROR_INSUFFICIENT_BUFFER {
            // Resize the buffer to the new size
            buffer = std::alloc::realloc(buffer, layout, size as usize);
            continue;
        }

        // Deallocate the buffer memory
        std::alloc::dealloc(buffer, layout);

        // Handle unknown failures
        return Err(std::io::Error::new(
            ErrorKind::Other,
            "Failed to get size estimate for TCP table",
        ));
    }

    Ok(buffer)
}
```

> The UDP implementation of this is pretty much the same but uses GetExtendedUdpTable 
> and UDP_TABLE_OWNER_MODULE instead

Now that we have the backing memory for the table we can cast the memory pointer to the table structure and 
create a slice from the known length and begin iterating over checking if any of the ports match

```rust
/// Searches through the IPv4 extended TCP table for any processes
/// that are listening on the provided `port`. Will append any processes
/// found onto the provided `pids` list
///
/// # Arguments
///
/// * `port` The port to search for
/// * `pids` The list of process IDs to append to
unsafe fn get_process_tcp_v4(port: u16, pids: &mut Vec<u32>) -> Result<(), Error> {
    // Create the memory layout for the table
    let layout = Layout::new::<MIB_TCPTABLE_OWNER_MODULE>();
    let buffer = get_extended_tcp_table(layout, AF_INET)?;

    let tcp_table: *const MIB_TCPTABLE_OWNER_MODULE = buffer.cast();

    // Read the length of the table
    let length = std::ptr::addr_of!((*tcp_table).dwNumEntries).read_unaligned() as usize;

    // Get a pointer to the start of the table
    let table_ptr: *const MIB_TCPROW_OWNER_MODULE = std::ptr::addr_of!((*tcp_table).table).cast();

    // Find the process IDs
    std::slice::from_raw_parts(table_ptr, length)
        .iter()
        .for_each(|element| {
            // Convert the port value
            let local_port: u16 = (element.dwLocalPort as u16).to_be();
            if local_port == port {
                pids.push(element.dwOwningPid)
            }
        });

    // Deallocate the buffer memory
    std::alloc::dealloc(buffer, layout);

    Ok(())
}
```

I had to make different implementations for IPv4 and IPv6 as the returned structure was different
for the different address families 

> The UDP version of this function is the same just using the UDP structures instead

### Killing Processes

Now for killing processes. In order to kill processes I must first obtain the process handle using `OpenProcess` with terminate access then I can call `TerminateProcess` the following code handles this 

```rust
/// Kills a process with the provided process ID
///
/// # Arguments
///
/// * `pid` - The process ID
unsafe fn kill_process(pid: u32) -> Result<(), Error> {
    info!("Killing process with PID {}", pid);

    // Open the process handle with intent to terminate
    let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
    if (&handle as *const isize).is_null() {
        return Err(std::io::Error::new(
            ErrorKind::Other,
            format!("Failed to obtain handle to process: {}", pid),
        ));
    }

    let result = TerminateProcess(handle, 0);
    if result == 0 {
        let error = GetLastError();
        return Err(std::io::Error::new(
            ErrorKind::Other,
            format!("Failed to terminate process {}: {:#x}", pid, error),
        ));
    }

    Ok(())
}
```

### Program function

Now that I have all the functions required to implement the functionality I can create the
function that the program uses to kill by port. The function name and arguments are the same
across all the platform implementations. This function finds all the PIDs for the different 
protocols and address families and collects them into a list of pids which it then iterates
over and kills each of the processes

```rust
/// Attempts to kill processes listening on the specified `port`.
///
/// Returns a `Result` with `true` if any processes were killed, `false` if no
/// processes were found listening on the port, and an `Error` if the operation
/// failed or the platform is unsupported.
///
/// # Arguments
///
/// * `port` - A u16 value representing the port number.
pub fn kill_processes_by_port(port: u16, _: KillPortSignalOptions) -> Result<bool, Error> {
    let mut pids = Vec::new();

    unsafe { get_process_tcp_v4(port, &mut pids)? }
    unsafe { get_process_tcp_v6(port, &mut pids)? }
    unsafe { get_process_udp_v4(port, &mut pids)? }
    unsafe { get_process_udp_v6(port, &mut pids)? }

    let mut killed = false;

    for pid in pids {
        debug!("Found process with PID {}", pid);
        unsafe { kill_process(pid)? }
        killed = true;
    }

    Ok(killed)
}
```

All that was left is to add the new module and function into the main program

```rust 
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "windows")]
use windows::kill_processes_by_port;
```

And with this the implementation was complete and working

## What I learned 

Through working on this project I learned how to allocate heap memory manually in Rust, How to interface with the Windows API, How to navigate the Windows API documentation, how to work with unsafe Rust and dealing with pointers.