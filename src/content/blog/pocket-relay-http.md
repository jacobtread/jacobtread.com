---
title: "Pocket Relay and it's new system"
description: "Migration from multiple servers to a single HTTP server"
pubDate: "03/25/2023"
updatedDate: "03/25/2023"
image: "/blog/pocket-relay-http/social.jpg"
heroImage: "/blog/pocket-relay-http/heading.jpg"
---

This blob post covers my newest advancements in my **Pocket Relay** project which you can view [Here](https://github.com/PocketRelay).

## How it originally was

Originally the **Pocket Relay** server was made up of the following servers all combined into a monolithic structure.

### Redirector

This server is what **Mass Effect 3** clients connect to initially. Because the **Mass Effect 3** servers are distributed and not all 1 central server this is used as a server which always stays at the same domain that being `gosredirector.ea.com`. This server then tells all the clients that connect the IP address / Hostname and the port of the server that the client should connect to which changes all the time the addresses often look like the following:

```
383933-gosprapp396.ea.com
```

This server requires a fixed port, that port being 42127. If that port was ever changed clients wouldn't be able to connect

---

### Quality of Service

With the official server there is multiple of these servers that the client connects to in order to figure out which it has the best connection speed to. This server is a UDP server which sends back the clients Public IP address. This is used by the client in order to provide its IP to other players that are connecting to them.

The client is provided the details of this server by the [Main](#main) server.

These server often have domains similar to the following:

```
gosgvaprod-qos01.ea.com
gosiadprod-qos01.ea.com
gossjcprod-qos01.ea.com
```

---

### Main

This server handles the bulk of all the server logic like games, matchmaking, player data etc. The client connects to this server after its been provided the address through the [Redirector](#redirector) server

---

### Telemetry

This server recieves informational messages from the **Mass Effect 3** game client. This includes messages for information like when players get kills and the details of each kill. An example of the decoded contents for one of these messages looks like the following:

```js
00000055/-;00000029/GAME/MULT/KILL/inst=Jacob&dead=SFXPawn_Cannibal2
&ksrc=M-8Avenger&posX=6180.4721&posY=1858.0004&posZ=91.1499
&mapv=biop_mpcer3&clas=AdeptHumanMale&levl=3&diff=0&mtch=1\0t
```

The above message describes a in game kill by "Jacob" who killed a Cannibal enemy using a M-8 Avenger and then the position of the enemy.

This server uses the `reports.tools.gos.ea.com` domain and runs on port 9988

---

### HTTP

This server is responsible for things like handling the **Galaxy At War** system and serving assets like the shop assets, and challenge reward banners. On the official server there is actually multiple HTTP servers; The official server has `waleu2.tools.gos.ea.com` which is used for the **Galaxy At War** system and then `me3.goscontent.ea.com` which is hosting the assets.

In **Pocket Relay** this server was repurposed to also be used for a custom [Dashboard](https://github.com/PocketRelay/Dashboard) for managing the server.

---

## How the clients interracted with it

Now in order to make **Mass Effect 3** clients work with these unofficial servers I created a [Client Setup Tool](https://github.com/PocketRelay/Client) which would modify the system hosts file to point the `gosredirector.ea.com` address to the target unofficial server. This tool also included a way to patch the game using the [Binkw32](https://github.com/Erik-JS/masseffect-binkw32) proxy auto patcher created by [Warranty Voider](https://github.com/zeroKilo) which enabled the game client to skip SSL verification on the servers.

Below is a screenshot of what the client tool looked like:

![Old Client](/blog/pocket-relay-http/old-client.png)

Now keeping the server structure like this was nice and provided easy setup for those who wanted to connect. However, this structure also had some disadvantages that I will list below:

### Lots of ports

The server requried 5 different ports which is a **LOT** of ports for a server to need open. This makes it very annoying and possibly unsafe to host publicly as you're required to expose so many ports.

This reason was actually one of the main causes for this new structure and design

---

### Complex Client

The client was quite complex involving multiple steps for patching the game and updating the hosts file and having the user have to remove the hosts edit using the tool every time they wanted to switch back to the official servers or use another EA game.

---

## How it was solved

Below is my process of solving this issue

### The original idea

In order to solve these issues I game up with an idea to move the Telemetry, Redirector, and Quality of Service servers to the client rather than having them on the server side. This is because these servers don't actually require being connect to the server as on the official servers they are also seperate parts.

Changing this would also allow the Redirector to use domains rather than only being able to use IP addresses as its target

> The original implementation made this possible by looking up the IP address for the domain before using it

While attempting this I ran into a few road blocks, of which the largest was that the server now wasn't easily able to tell the client where the HTTP server was as it no longer knows what it's address is relative to the users computer

> Previously this wasn't an issue becuase the client was setting the `gosredirector.ea.com` domain to the IP address of the server, This allowed the server to use that domain in place of its public address.

---

### Taking it up a notch

Quickly realizing that this wasn't going to be something that would work easily I took my ideas back to the drawing board. Early on I had mentioned to a friend of mine that it could be possible to proxy the data which would normally go the Main server over a WebSocket connection which would.

This idea seemed great in theory however I realized that I would have to decode and then re-encoding packets in order to properly send them over the WebSocket protocol, Which would likely create **MASSIVE** performance bottlenecks along with un-nessicary memory usage so that idea seemed off the table.

I decided to look into the WebSocket protocol because I wasn't sure how it was actually working under the hood. To my suprise I found out that HTTP connections can be directly Upgraded to a raw stream of bytes on the underlying transport using [HTTP Upgrade](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Upgrade) and that WebSockets made use of this with its own protocol.

This sparked an idea which got me thinking "I wonder if its possible for me to upgrade my HTTP connection direcly into a Blaze stream" this would replace the need for any sort of decoding and re-encoding as I would be able to use the upgraded HTTP stream directly.

I got to work on writing an extractor, I took a look at how the [Axum](https://docs.rs/axum/latest/axum/) framework handled [WebSocket Upgrades](https://docs.rs/axum/latest/src/axum/extract/ws.rs.html) and found out that [Hyper](https://docs.rs/hyper/latest/hyper/upgrade/) the library which Axum uses nder the hood has a really easy implementation for both server and client side.

Using this new found knowledge I got to work quickly prototyping the new server and client. This process went a lot smoother than I expected and I quickly had a working prototype of the client and the server.

#### My extractor implementation

```rust
use axum::{
    extract::FromRequestParts,
    http::{Method, StatusCode},
    response::IntoResponse,
};
use hyper::upgrade::{OnUpgrade, Upgraded};
use log::debug;
use std::future::ready;
use thiserror::Error;

use crate::session::SessionHostTarget;

#[derive(Debug, Error)]
pub enum BlazeUpgradeError {
    #[error("Cannot upgrade not GET requests")]
    UnacceptableMethod,
    #[error("Failed to upgrade connection")]
    FailedUpgrade,
    #[error("Cannot upgrade connection")]
    CannotUpgrade,
}

/// Extractor for initiated the upgrade process for a request
pub struct BlazeUpgrade {
    /// The upgrade handle
    on_upgrade: OnUpgrade,
    host_target: SessionHostTarget,
}

/// HTTP request upgraded into a Blaze socket along with
/// extra information
pub struct BlazeSocket {
    /// The upgraded connection
    pub upgrade: Upgraded,

    pub host_target: SessionHostTarget,
}

impl BlazeUpgrade {
    /// Upgrades the underlying hook returning the newly created socket
    pub async fn upgrade(self) -> Result<BlazeSocket, BlazeUpgradeError> {
        // Attempt to upgrade the connection
        let upgrade = match self.on_upgrade.await {
            Ok(value) => value,
            Err(_) => return Err(BlazeUpgradeError::FailedUpgrade),
        };

        Ok(BlazeSocket {
            upgrade,
            host_target: self.host_target,
        })
    }
}

/// Header for the Pocket Relay connection scheme used by the client
const HEADER_SCHEME: &str = "X-Pocket-Relay-Scheme";
/// Header for the Pocket Relay connection port used by the client
const HEADER_PORT: &str = "X-Pocket-Relay-Port";
/// Header for the Pocket Relay connection host used by the client
const HEADER_HOST: &str = "X-Pocket-Relay-Host";

impl<S> FromRequestParts<S> for BlazeUpgrade
where
    S: Send + Sync,
{
    type Rejection = BlazeUpgradeError;

    fn from_request_parts<'life0, 'life1, 'async_trait>(
        parts: &'life0 mut axum::http::request::Parts,
        _state: &'life1 S,
    ) -> core::pin::Pin<
        Box<
            dyn core::future::Future<Output = Result<Self, Self::Rejection>>
                + core::marker::Send
                + 'async_trait,
        >,
    >
    where
        'life0: 'async_trait,
        'life1: 'async_trait,
        Self: 'async_trait,
    {
        // Ensure the method is GET
        if parts.method != Method::GET {
            return Box::pin(ready(Err(BlazeUpgradeError::UnacceptableMethod)));
        }

        // Get the upgrade hook
        let on_upgrade = match parts.extensions.remove::<OnUpgrade>() {
            Some(value) => value,
            None => return Box::pin(ready(Err(BlazeUpgradeError::CannotUpgrade))),
        };

        // Get the client scheme header
        let scheme = parts
            .headers
            .get(HEADER_SCHEME)
            .and_then(|value| value.to_str().ok())
            .map(|value| value.to_string())
            .unwrap_or_else(|| {
                debug!("Failed to extract scheme");
                "http".to_string()
            });

        // Get the client port header
        let port: u16 = parts
            .headers
            .get(HEADER_PORT)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.parse().ok())
            .unwrap_or_else(|| {
                debug!("Failed to extract port");
                if scheme == "https" {
                    443
                } else {
                    80
                }
            });

        let host = parts
            .headers
            .get(HEADER_HOST)
            .and_then(|value| value.to_str().ok())
            .map(|value| value.to_string());

        let host = match host {
            Some(value) => value,
            None => return Box::pin(ready(Err(BlazeUpgradeError::CannotUpgrade))),
        };

        Box::pin(ready(Ok(Self {
            on_upgrade,
            host_target: SessionHostTarget { scheme, host, port },
        })))
    }
}

impl IntoResponse for BlazeUpgradeError {
    fn into_response(self) -> axum::response::Response {
        (StatusCode::BAD_REQUEST, self.to_string()).into_response()
    }
}
```

and then upgrading clients was as simple as adding a new endpoint to the HTTP server with the following logic.

The code below is snippets from the actual code present in [http/routes/server.rs](https://github.com/PocketRelay/Server/blob/master/src/http/routes/server.rs)

```rust

/// Router function creates a new router with all the underlying
/// routes for this file.
///
/// Prefix: /api/server
pub fn router() -> Router {
    Router::new()
        .route("/upgrade", get(upgrade))
}


static SESSION_IDS: AtomicU32 = AtomicU32::new(1);

/// Route handling upgrading Blaze connections into streams that can
/// be used as blaze sessions
async fn upgrade(upgrade: BlazeUpgrade) -> Result<Response, StatusCode> {
    tokio::spawn(async move {
        let socket = match upgrade.upgrade().await {
            Ok(value) => value,
            Err(err) => {
                error!("Failed to upgrade blaze socket: {}", err);
                return;
            }
        };
        Session::create(|ctx| {
            // Obtain a session ID
            let session_id = SESSION_IDS.fetch_add(1, Ordering::AcqRel);

            // Attach reader and writers to the session context
            let (read, write) = split(socket.upgrade);
            let read = FramedRead::new(read, PacketCodec);
            let write = FramedWrite::new(write, PacketCodec);

            ctx.attach_stream(read, true);
            let writer = ctx.attach_sink(write);

            Session::new(session_id, socket.host_target, writer)
        });
    });

    Response::builder()
        .status(StatusCode::SWITCHING_PROTOCOLS)
        .header(header::CONNECTION, HeaderValue::from_static("upgrade"))
        .header(header::UPGRADE, HeaderValue::from_static("blaze"))
        .body(BoxBody::default())
        .map_err(|_| {
            error!("Failed to create upgrade response");
            StatusCode::INTERNAL_SERVER_ERROR
        })
}
```

Then the client just needed to handle any connections and make a get request which then becomes an upgraded stream that it can pipe all the data through

```rust
use crate::{constants::MAIN_PORT, show_error, TARGET};
use reqwest::{
    header::{self, HeaderMap, HeaderValue},
    Client, Upgraded,
};
use std::{io, net::Ipv4Addr, process::exit};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    select,
};

/// Starts the main server proxy. This creates a connection to the Pocket Relay
/// which is upgraded and then used as the main connection fro the game.
pub async fn start_server() {
    // Initializing the underlying TCP listener
    let listener = match TcpListener::bind((Ipv4Addr::UNSPECIFIED, MAIN_PORT)).await {
        Ok(value) => value,
        Err(err) => {
            let text = format!("Failed to start main: {}", err);
            show_error("Failed to start", &text);
            exit(1);
        }
    };

    // Accept incoming connections
    loop {
        let (stream, _) = match listener.accept().await {
            Ok(value) => value,
            Err(_) => break,
        };

        // Spawn off a new handler for the connection
        tokio::spawn(handle_blaze(stream));
    }
}

/// Header for the Pocket Relay connection scheme used by the client
const HEADER_SCHEME: &str = "X-Pocket-Relay-Scheme";
/// Header for the Pocket Relay connection port used by the client
const HEADER_PORT: &str = "X-Pocket-Relay-Port";
/// Header for the Pocket Relay connection host used by the client
const HEADER_HOST: &str = "X-Pocket-Relay-Host";
/// Endpoint for upgrading the server connection
const UPGRADE_ENDPOINT: &str = "/api/server/upgrade";
/// The size of the buffers used for proxying data
const BUFFER_SIZE: usize = 4096;

async fn handle_blaze(client: TcpStream) {
    let target = match &*TARGET.read().await {
        Some(value) => value.clone(),
        None => return,
    };

    // Create the upgrade URL
    let mut url = String::new();
    url.push_str(&target.scheme);
    url.push_str("://");
    url.push_str(&target.host);
    url.push_str(UPGRADE_ENDPOINT);

    // Create the HTTP Upgrade headers
    let mut headers = HeaderMap::new();
    headers.insert(header::CONNECTION, HeaderValue::from_static("Upgrade"));
    headers.insert(header::UPGRADE, HeaderValue::from_static("blaze"));

    // Append the schema header
    if let Ok(scheme_value) = HeaderValue::from_str(&target.scheme) {
        headers.insert(HEADER_SCHEME, scheme_value);
    }

    // Append the port header
    headers.insert(HEADER_PORT, HeaderValue::from(target.port));

    // Append the host header
    if let Ok(host_value) = HeaderValue::from_str(&target.host) {
        headers.insert(HEADER_HOST, host_value);
    }

    // Create the request
    let request = Client::new().get(url).headers(headers).send();

    // Await the server response to the request
    let response = match request.await {
        Ok(value) => value,
        Err(_) => return,
    };

    // Server connection gained through upgrading the client
    let server = match response.upgrade().await {
        Ok(value) => value,
        Err(_) => return,
    };

    // Pipe all the content between the client and server
    let _ = pipe(client, server).await;
}

/// Reads all the bytes from the client and the server sending the bytes to
/// the opposite side (i.e. client -> server, and server -> client)
///
/// `client` The client stream to pipe
/// `server` The server stream to pipe
async fn pipe(mut client: TcpStream, mut server: Upgraded) -> io::Result<()> {
    // Buffer for data recieved from the client
    let mut client_buffer = [0u8; BUFFER_SIZE];
    // Buffer for data recieved from the server
    let mut server_buffer = [0u8; BUFFER_SIZE];

    loop {
        select! {
            result = client.read(&mut client_buffer) => {
                let count = result?;
                server.write(&client_buffer[0..count]).await?;
                server.flush().await?;
            },
            result = server.read(&mut server_buffer) => {
                let count = result?;
                client.write(&server_buffer[0..count]).await?;
                client.flush().await?;
            }
        };
    }
}
```

The code for the client can be viewed [Here](https://github.com/PocketRelay/Client) and the server [Here](https://github.com/PocketRelay/Server)

---

### How it turned out

With the new structure completely implemented I changed much of how the client looks. The client no longer required the user to press remove for the hosts modification instead now the hosts modification only ever needs to be set to `127.0.0.1` which means it's now possible for it to be automatically added and removed for the user. Below is the new design:

![New Client](/blog/pocket-relay-http/new-client.jpg)

Now that the new client is running the servers along with the proxy for the main server its require that this stays running.

With all these improvements the server now only needs to expose 1 port that being the HTTP port. This is amazing seeing that the server previously had to expose 5 different ports.

---

## The benefits of this

This new structure came with many benfits, below are some of the most notable

### Only 1 port

The server now only has to expose 1 port which makes the life of the server maintainers much easier and also prevents the security hole of having so many extra ports left open

---

### HTTPs Support

Prevously the Main server was not able to be easily secured as it would require lots of extra code to implement TLS for the server and would also require the users to manually specify certificate and private key files.

This all changes now that the entire server runs over HTTP. Due to the server using HTTP upgrades the server can now completely communicate through the HTTP protocol which means the server can be placed behind an NGINX proxy that provides TLS. This effectively gives the server **FREE** extra security.

---

### Better hosting support

Previously if you wanted to host a **Pocket Relay** server you would have to get Dedicated, VPS hosting, or something similar in order to be able to expose all the required ports. This all changes with the new server as it only requires an HTTP port. This opens the server up to many hosting options including Google Cloud free container hosting.

---

### Server knowledge

Because of how HTTP upgrades work if the server needs extra information about the client environment it possible to transmit that information through the initial request before the session is created. Previously such things wouldn't be possible or atleast wouldn't be reliable. This extra knowledge was made use of in order to provide the correct HTTP server details to the client. This was achieved by having the client provide headers containing the server details.
