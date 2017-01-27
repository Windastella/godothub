# GodotHub
___

Multiplayer and network messaging Server for Godot.

The Godot Client code are in written as class which can be instanced through script.

The main idea of GodotHub is to have a thin server that only handle the connection and broadcast the data to channel(lobby).

## Requirement
___

The GodotHub serevr is so thin you'll on need

1. [NodeJS](https://nodejs.org/en/)

And... that's it!

## Installation
___

After you install NodeJS. Open your terminal/command prompt install it through npm

`npm install github:Windastella/godothub`

and start the server

`godothub --port 5000 --host 127.0.0.1`

This will start the server on 127.0.0.1:5000 .

If no parameter are pass, the server will default to above setting.

Proceed to the Client Class for implementation example.
