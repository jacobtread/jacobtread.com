---
title: "Interlink async framework"
description: "Creation of my async framework"
pubDate: "04/23/2023"
updatedDate: "04/23/2023"
socialImage: "/blog/interlink/social.jpg"
heroImage: "/blog/interlink/social.jpg"
---

![License](https://img.shields.io/github/license/jacobtread/interlink?style=for-the-badge)
![Cargo Version](https://img.shields.io/crates/v/interlink?style=for-the-badge)
![Cargo Downloads](https://img.shields.io/crates/d/interlink?style=for-the-badge)

This blog post covers the creation of my async framework **Interlink** which I make use of in my **Pocket Relay** project
for managing shared states and communication between asynchronous entities. You can find the source code for **Interlink**
on it [GitHub](https://github.com/jacobtread/interlink)

## Inspriation

While working on **Pocket Relay** my project was a mess of different frameworks ([Tokio](https://tokio.rs/), and [Actix](https://actix.rs/)) and I was plagued by having
to have locks all throughout the project. This made the developer experience quite poor and also introduced a lot of complexity to
the project with having to manage all the locks everywhere.

While searching for a solution a few times I attempted to port the project over to the [Actix Actors](https://actix.rs/docs/actix/actor) async pattern. Porting to Actix Actors completely removed the original problem with needing lots of locks for everything. However, it introduced a performance bottleneck due to the Actors side of actix being single threaded which also caused issues as at the time **Pocket Relay** ran many services as a monolith which didn't
play nicely running on a single thread.

> NOTE: I think its possible to do multi-threading with actix actors however I spent far too long attempting to without getting
> any working results

So rather than ditching the nice and familiar Actors pattern I decided to create my own async framework that uses a similar pattern but that makes full use of tokio for multi-threading

## How it works

Interlink uses a very similar structure to the Actix Actors pattern

Interlink represents different asynchronous entities as "Services" and these services can be communicated with using "Messages" that are sent through "Links". Services are spawned into a tokio task and wait for messages and can then execute actions when they receive messages.

Rather than my previous approach where the external logic obtains mutable access to the entity from the outside and then makes its modifications; this structure instead allows the external logic to send messages to the entity and then the entity completes mutable actions on itself. This new structure means
that the service is always the sole owner of its state giving it free-range to mutate itself.

## An example service

Below is an example service. This service accepts messages that contain text and prints out the text

```rust
 use interlink::prelude::*;

 // Define your backing structure for the service
 #[derive(Service)]
 struct Example;

 // The message struct with a string response type
 #[derive(Message)]
 #[msg(rtype = "String")]
 struct TextMessage {
     value: String,
 }

 /// Implement a handler for the message type
 impl Handler<TextMessage> for Example {

     /// Basic response type which just responds with the value
     type Response = Mr<TextMessage>

     fn handle(
         &mut self,
         msg: TextMessage,
         ctx: &mut ServiceContext<Self>
     ) -> Self::Response {
         println!("Got message: {}", &msg.value);
         Mr(msg.value)
     }
 }

 // You must be within the tokio runtime to use interlink
 #[tokio::main]
 async fn main() {
     // Create the service
     let service = Example {};
     // Start the service to get a link to the service
     let link = service.start();

     // Send the text message to the service and await the response
     let res: String = link.send(TextMessage {
             value: "Example".to_string(),
         })
         .await
         .unwrap();

     assert_eq!(&res, "Example");

     // You can also send without waiting for a response
     link.do_send(TextMessage {
             value: "Example".to_string(),
         })
         .unwrap();

 }
```

## Links

Links are a cheaply clonable interface for sending messages and actions to services. There are two different variants of link types: The standard `Link` which is a link to a service and can send any message type that the service is able to handle, and `MessageLink` which is capable of being a link to any service that accepts a specific message type.

Links can send messages in different ways and do more than just send messages.

### Simple Message Sending

The simplest thing you can do with a link is sending a message to a service. The [Link::send](https://docs.rs/interlink/latest/interlink/link/struct.Link.html#method.send) method sends a message to the service and allows asyncronously awaiting for the response.

The below example sends a string message to the service and obtains the string back as the response after awaiting the
send call.

```rust
use interlink::prelude::*;

#[derive(Service)]
struct Test;

#[derive(Message)]
#[msg(rtype = "String")]
struct MyMessage {
    value: String,
}

impl Handler<MyMessage> for Test {
    type Response = Mr<MyMessage>;

    fn handle(&mut self, msg: MyMessage, ctx: &mut ServiceContext<Self>) -> Self::Response {
        Mr(msg.value)
    }
}

#[tokio::test]
async fn test() {
    let link = Test {}.start();
    let resp = link.send(MyMessage {
        value: "Test123".to_string()
    })
    .await
    .unwrap();

    assert_eq!(&resp, "Test123")
}
```

### Send and forget

There is an alternative form for sending messages for cases that you don't want to wait for the response "Send and forget". This is useful in cases such as being outside an asynchronous context where you are unable to wait for the response but need to cause an action on a service. For this you can use [Link::do_send](https://docs.rs/interlink/latest/interlink/link/struct.Link.html#method.do_send)

```rust
use interlink::prelude::*;

#[derive(Service)]
struct Test;

#[derive(Message)]
struct MyMessage {
    value: String,
}

impl Handler<MyMessage> for Test {
    type Response = ();

    fn handle(&mut self, msg: MyMessage, ctx: &mut ServiceContext<Self>) {
        assert_eq!(&msg.value, "Test123");
    }
}

#[tokio::test]
async fn test() {
    let link = Test {}.start();
    link.do_send(MyMessage {
        value: "Test123".to_string()
    })
    .unwrap();
}
```

### Executing actions

You can also directly execute actions on a service through the [Link::exec](https://docs.rs/interlink/latest/interlink/link/struct.Link.html#method.exec) and [Link::do_exec](https://docs.rs/interlink/latest/interlink/link/struct.Link.html#method.do_exec) methods which take a closure that is provided mutable access to the service and its context

Example using exec to mutate a string stored on a service then cloning and sending back the response:

```rust
use interlink::prelude::*;

#[derive(Service)]
struct Test {
    value: String
}

#[tokio::test]
async fn test() {
    let link = Test { value: "Test".to_string() }.start();

    let value = link.exec(|service: &mut Test, _ctx| {
        service.value.push('A');

        service.value.clone()
    })
    .await
    .expect("Failed to execute action on service");

    assert_eq!(value, "TestA");
}
```

Example using do_exec to mutate a string stored on a service then printing the new value:

```rust
use interlink::prelude::*;

#[derive(Service)]
struct Test {
    value: String
}

#[tokio::test]
async fn test() {
    let link = Test { value: "Test".to_string() }.start();

    link.do_exec(|service: &mut Test, _ctx| {
        println!("Value: {}", service.value);

        service.value.push('A');

        println!("Value: {}", service.value);
    })
    .expect("Failed to execute action on service");
}
```

## More

More details about different functions and things that can be done with Interlink can be found on its [Documentation Page](https://docs.rs/interlink/latest/interlink/)
