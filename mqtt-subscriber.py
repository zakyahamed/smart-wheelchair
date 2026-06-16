#!/usr/bin/env python3
"""
MQTT Subscriber for Wheelchair Commands
Subscribes to wheelchair topics and prints all messages received from the broker.
"""

import paho.mqtt.client as mqtt
import json
from datetime import datetime

# Configuration
BROKER_HOST = 'broker.hivemq.com'
BROKER_PORT = 8000
BROKER_WEBSOCKET_PATH = '/mqtt'
TOPICS_TO_SUBSCRIBE = [
    'wheelchair/+/command',      # All wheelchair commands
    'wheelchair/+/status',       # All wheelchair status updates
    'wheelchair/+/location',     # All wheelchair locations
]

# Callback when client connects to broker
def on_connect(client, userdata, connect_flags, reason_code, properties=None):
    if reason_code == 0:
        print(f"✓ Connected to broker {BROKER_HOST}:{BROKER_PORT}")
        # Subscribe to all topics
        for topic in TOPICS_TO_SUBSCRIBE:
            client.subscribe(topic, qos=1)
            print(f"  → Subscribed to: {topic}")
    else:
        print(f"✗ Connection failed with code {reason_code}")

# Callback when client receives a message
def on_message(client, userdata, msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    topic = msg.topic
    payload = msg.payload.decode('utf-8')
    
    # Try to parse as JSON for pretty printing
    try:
        data = json.loads(payload)
        message = json.dumps(data, indent=2)
    except:
        message = payload
    
    print(f"\n[{timestamp}] Message received on '{topic}':")
    print(f"  {message}")

# Callback when client disconnects
def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    if reason_code == 0:
        print("✓ Disconnected from broker")
    else:
        print(f"✗ Unexpected disconnection with code {reason_code}")

# Callback for errors
def on_subscribe(client, userdata, mid, reason_code_list, properties=None):
    if reason_code_list[0].is_failure:
        print(f"✗ Subscription failed: {reason_code_list[0]}")
    else:
        print(f"✓ Subscription successful")

# Create MQTT client
client = mqtt.Client(mqtt.CallbackAPIVersion.V2, client_id='python-subscriber-' + str(datetime.now().timestamp()).replace('.', ''))

# Set callbacks
client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect
client.on_subscribe = on_subscribe

# Connect to broker using WebSocket
broker_url = f"ws://{BROKER_HOST}:{BROKER_PORT}{BROKER_WEBSOCKET_PATH}"
print(f"Connecting to {broker_url}...")

try:
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    # Set WebSocket sub-protocol
    client.ws_set_options(path=BROKER_WEBSOCKET_PATH, headers=None)
    
    # Start network loop - blocks until interrupted
    print("\n✓ Listening for messages... (Press Ctrl+C to exit)\n")
    client.loop_forever()
except KeyboardInterrupt:
    print("\n\n✓ Shutting down...")
    client.disconnect()
    client.loop_stop()
except Exception as err:
    print(f"✗ Error: {err}")
    client.disconnect()
