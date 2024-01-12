---
title: "Adding Windows support to killport"
description: "How I added Windows support to the killport project"
pubDate: "05/10/2023"
updatedDate: "11/14/2023"
---

This blog post covers what I learned and how I implemented Windows support for the killport project [Here](https://github.com/jkfran/killport)

The pull request these changes were made in [Reference Pull Request](https://github.com/jkfran/killport/pull/21) and
later I updated it with an improved version in [Updated pull request](https://github.com/jkfran/killport/pull/25)

## Intro

While doing my late night scrolling through GitHub I stumbled upon this cool little project called [killport](https://github.com/jkfran/killport) in my GitHub Explore. I took a peek through the code and the README and though this looked like a cool project. I noticed that the project didn't support Windows so I jotted down a note
to begin working on it tomrrow.

> The killport project is a command line tool which allows you to kill any process that is using specific ports

## Getting started

Fast forward to the next day im ready to start the project. With my very little experience in working with the Windows API I first decided to browser the API docs in search of a function which could provide me a mapping between port numbers and process IDs.

### Functions

The functions that I found for this were the following

-   [GetExtendedTcpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable) Retrieves a table of TCP endpoints with the details about their owners
-   [GetExtendedUdpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedudptable) Retrieves a table of UDP endpoints with the details about their owners
-   [OpenProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-openprocess) Opens a handle to the process to allow terminating
-   [TerminateProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-terminateprocess) Can terminate a process using its handle

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
  "Win32_System_Diagnostics_ToolHelp",
]
```

I only add this dependency for the Windows platform as thats the only target that will make use of this dependency

## Implementation

Because the GetExtendedTcpTable and GetExtendedUdpTable need to provide a list of unknown size back to me after being called I need to do heap allocations for the API to store the structured data.

### TableClass trait

When accessing the tables from `GetExtendedTcpTable` and `GetExtendedUdpTable` each of them require a slightly different
structure so to reduce duplication and create a simple way to access the required field on all of them I created `TableClass`
trait that wraps this functionality.

```rust
/// Type of the GetExtended[UDP/TCP]Table Windows API function
type GetExtendedTable =
    unsafe extern "system" fn(*mut c_void, *mut u32, i32, AddressFamily, i32, u32) -> WIN32_ERROR;

/// For some reason the actual INET types are u16 so this
/// is just a casted version to u32
type AddressFamily = u32;

/// IPv4 Address family
const INET: AddressFamily = AF_INET as u32;
/// IPv6 Address family
const INET6: AddressFamily = AF_INET6 as u32;

/// Table class type (either TCP_TABLE_CLASS for TCP or UDP_TABLE_CLASS for UDP)
type TableClassType = i32;

/// TCP class type for the owner to module mappings
const TCP_TYPE: TableClassType = TCP_TABLE_OWNER_MODULE_ALL;
/// UDP class type for the owner to module mappings
const UDP_TYPE: TableClassType = UDP_TABLE_OWNER_MODULE;

/// Trait implemented by extended tables that can
/// be enumerated for processes that match a
/// specific PID
trait TableClass {
    /// Windows function for loading this table class
    const TABLE_FN: GetExtendedTable;

    /// Address family type
    const FAMILY: AddressFamily;

    /// Windows table class type
    const TABLE_CLASS: TableClassType;

    /// Iterates the contents of the extended table inserting any
    /// process entires that match the provided `port` into the
    /// `pids` set
    ///
    /// # Arguments
    ///
    /// * `table` - The pointer to the table class
    /// * `port` - The port to search for
    /// * `pids` - The process IDs to insert into
    unsafe fn get_processes(table: *const Self, port: u16, pids: &mut HashSet<u32>);
}
```

This trait has 3 constants which are for the following:

`TABLE_FN` - Provides the pointer to the windows function for loading the table (`GetExtendedTcpTable`, `GetExtendedUdpTable`)
`FAMILY` - The address family that the table will use (AF_INET (IPv4), AF_INET (IPv6))
`TABLE_CLASS` - The class type to ask windows to provide for this specific table class (`TCP_TABLE_OWNER_MODULE_ALL`, `UDP_TABLE_OWNER_MODULE`)

And the trait also includes a function `get_processes` which is responsible for finding all
of the processes in the table that are bound to the provided `port` and adding them to the `pids` HashSet

### Implementing the trait

All of the traits implementations access the same variables from the underlying table however because each
of the different variants return different types where the required entries have different shapes they cannot
share a single function implementation, to get around this I have created a macro called `impl_get_processes` for the
`TableClass` trait in order to implement the `get_processes` function without having to repeat the same code. The
macro takes in the type of structure that the table pointer will represent.

```rust
/// Implementation for get_processes is identical for all of the
/// implementations only difference is the type of row pointer
/// other than that all the fields accessed are the same to in
/// order to prevent repeating this its a macro now
macro_rules! impl_get_processes {
    ($ty:ty) => {
        unsafe fn get_processes(table: *const Self, port: u16, pids: &mut HashSet<u32>) {
            let row_ptr: *const $ty = addr_of!((*table).table).cast();
            let length: usize = addr_of!((*table).dwNumEntries).read_unaligned() as usize;

            slice::from_raw_parts(row_ptr, length)
                .iter()
                .for_each(|element| {
                    // Convert the port value
                    let local_port: u16 = (element.dwLocalPort as u16).to_be();
                    if local_port == port {
                        pids.insert(element.dwOwningPid);
                    }
                });
        }
    };
}
```

The above code casts the underlying table to a pointer to the type provided to the macro
where it is then iterated (Turned into a slice as the length is provided by the `dwNumEntries` field)
and the dwLocalPort field is checked on each of the rows, if this field matches then the `dwOwningPid` (Process ID)
is added to the `pids` HashSet.

Then this macro can be used to define all the different table class variants:

```rust
/// TCP IPv4 table class
impl TableClass for MIB_TCPTABLE_OWNER_MODULE {
    const TABLE_FN: GetExtendedTable = GetExtendedTcpTable;
    const FAMILY: AddressFamily = INET;
    const TABLE_CLASS: TableClassType = TCP_TYPE;

    impl_get_processes!(MIB_TCPROW_OWNER_MODULE);
}

/// TCP IPv6 table class
impl TableClass for MIB_TCP6TABLE_OWNER_MODULE {
    const TABLE_FN: GetExtendedTable = GetExtendedTcpTable;
    const FAMILY: AddressFamily = INET6;
    const TABLE_CLASS: TableClassType = TCP_TYPE;

    impl_get_processes!(MIB_TCP6ROW_OWNER_MODULE);
}

/// UDP IPv4 table class
impl TableClass for MIB_UDPTABLE_OWNER_MODULE {
    const TABLE_FN: GetExtendedTable = GetExtendedUdpTable;
    const FAMILY: AddressFamily = INET;
    const TABLE_CLASS: TableClassType = UDP_TYPE;

    impl_get_processes!(MIB_UDPROW_OWNER_MODULE);
}

/// UDP IPv6 table class
impl TableClass for MIB_UDP6TABLE_OWNER_MODULE {
    const TABLE_FN: GetExtendedTable = GetExtendedUdpTable;
    const FAMILY: AddressFamily = INET6;
    const TABLE_CLASS: TableClassType = UDP_TYPE;

    impl_get_processes!(MIB_UDP6ROW_OWNER_MODULE);
}
```

### Finding the processes within the tables

Now that theres a way to collect the processes from all the different table classes I created a generic function
which takes in a `TableClass` and requests that table from windows then uses `TableClass::get_processes` to find
and store all the processed ids for the matching port

```rust
/// Reads the extended table of the specified generic [`TableClass`] iterating
/// the processes in that extended table checking if any bind the provided `port`
/// those that do will have the process ID inserted into `pids`
///
/// # Arguments
///
/// * `port` - The port to check for
/// * `pids` - The output list of process IDs
unsafe fn use_extended_table<T>(port: u16, pids: &mut HashSet<u32>) -> Result<()>
where
    T: TableClass,
{
    // Allocation of initial memory
    let mut layout: Layout = Layout::new::<T>();
    let mut buffer: *mut u8 = alloc(layout);

    // Current buffer size later changed by the fn call to be the estimated size
    // for resizing the buffer
    let mut size: u32 = layout.size() as u32;

    // Result of asking for the table
    let mut result: WIN32_ERROR;

    loop {
        // Ask windows for the extended table
        result = (T::TABLE_FN)(
            buffer.cast(),
            &mut size,
            FALSE,
            T::FAMILY,
            T::TABLE_CLASS,
            0,
        );

        // No error occurred
        if result == NO_ERROR {
            break;
        }

        // Always deallocate the memory regardless of the error
        // (Resizing needs to reallocate the memory anyway)
        dealloc(buffer, layout);

        // Handle buffer too small
        if result == ERROR_INSUFFICIENT_BUFFER {
            // Create the new memory layout from the new size and previous alignment
            layout = Layout::from_size_align_unchecked(size as usize, layout.align());
            // Allocate the new chunk of memory
            buffer = alloc(layout);
            continue;
        }

        // Handle unknown failures
        return Err(Error::new(
            ErrorKind::Other,
            format!(
                "Failed to get size estimate for extended table: {:#x}",
                result
            ),
        ));
    }

    let table: *const T = buffer.cast();

    // Obtain the processes from the table
    T::get_processes(table, port, pids);

    // Deallocate the buffer memory
    dealloc(buffer, layout);

    Ok(())
}
```

### Killing Processes

Now for killing processes. In order to kill processes I must first obtain the process handle using `OpenProcess` with `PROCESS_TERMINATE` (Permission to terminate the process) then I can call `TerminateProcess` the following code handles this

```rust
/// Kills a process with the provided process ID
///
/// # Arguments
///
/// * `pid` - The process ID
unsafe fn kill_process(pid: u32) -> Result<()> {
    info!("Killing process with PID {}", pid);

    // Open the process handle with intent to terminate
    let handle: HANDLE = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
    if handle == 0 {
        let error: WIN32_ERROR = GetLastError();
        return Err(Error::new(
            ErrorKind::Other,
            format!("Failed to obtain handle to process {}: {:#x}", pid, error),
        ));
    }

    // Terminate the process
    let result: BOOL = TerminateProcess(handle, 0);

    // Close the handle now that its no longer needed
    CloseHandle(handle);

    if result == FALSE {
        let error: WIN32_ERROR = GetLastError();
        return Err(Error::new(
            ErrorKind::Other,
            format!("Failed to terminate process {}: {:#x}", pid, error),
        ));
    }

    Ok(())
}
```

### Collecting parents

Some processes are pesky and have other processes that will restart them (An example of this is nginx) to fix this, we can
search for all the parent processes of the process that we are going to kill and kill them too:

```rust
/// Collects all the parent processes for the PIDs in
/// the provided set
///
/// # Arguments
///
/// * `pids` - The set to match PIDs from and insert PIDs into
unsafe fn collect_parents(pids: &mut HashSet<u32>) -> Result<()> {
    // Request a snapshot handle
    let handle: HANDLE = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

    // Ensure we got a valid handle
    if handle == INVALID_HANDLE_VALUE {
        let error: WIN32_ERROR = GetLastError();
        return Err(Error::new(
            ErrorKind::Other,
            format!("Failed to get handle to processes: {:#x}", error),
        ));
    }

    // Allocate the memory to use for the entries
    let mut entry: PROCESSENTRY32 = std::mem::zeroed();
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32>() as u32;

    // Process the first item
    if Process32First(handle, &mut entry) != FALSE {
        let mut count = 0;

        loop {
            // Add matching processes to the output
            if pids.contains(&entry.th32ProcessID) {
                pids.insert(entry.th32ParentProcessID);
                count += 1;
            }

            // Process the next entry
            if Process32Next(handle, &mut entry) == FALSE {
                break;
            }
        }

        info!("Collected {} parent processes", count);
    }

    // Close the handle now that its no longer needed
    CloseHandle(handle);

    Ok(())
}
```

### Program function

Now that I have all the functions required to implement the functionality I can create the
function that the program uses to kill by port. The function name and arguments are the same
across all the platform implementations. This function finds all the PIDs for the different
protocols and address families and collects them into a list of pids which it then iterates
over and kills each of the processes.

It does this by calling the `use_extended_table` function for all the different table types
then collecting the parent processes for any found process IDs using `collect_parents`,
and then finally after all that it calls `kill_process` on all the found processes

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
pub fn kill_processes_by_port(port: u16, _: KillPortSignalOptions) -> Result<bool> {
    let mut pids: HashSet<u32> = HashSet::new();
    unsafe {
        // Find processes in the TCP IPv4 table
        use_extended_table::<MIB_TCPTABLE_OWNER_MODULE>(port, &mut pids)?;

        // Find processes in the TCP IPv6 table
        use_extended_table::<MIB_TCP6TABLE_OWNER_MODULE>(port, &mut pids)?;

        // Find processes in the UDP IPv4 table
        use_extended_table::<MIB_UDPTABLE_OWNER_MODULE>(port, &mut pids)?;

        // Find processes in the UDP IPv6 table
        use_extended_table::<MIB_UDP6TABLE_OWNER_MODULE>(port, &mut pids)?;

        // Nothing was found
        if pids.is_empty() {
            return Ok(false);
        }

        // Collect parents of the PIDs
        collect_parents(&mut pids)?;

        for pid in pids {
            kill_process(pid)?;
        }

        // Something had to have been killed to reach here
        Ok(true)
    }
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
