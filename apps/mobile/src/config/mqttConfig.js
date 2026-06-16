// MQTT Configuration (hardcoded for Expo compatibility - process.env doesn't reliably work in RN)
const MQTT_CONFIG = {
  BROKER_HOST: 'broker.hivemq.com',
  BROKER_PORT: 8000,
  BROKER_PROTOCOL: 'ws',

  getBrokerUrl() {
    return `${this.BROKER_PROTOCOL}://${this.BROKER_HOST}:${this.BROKER_PORT}/mqtt`;
  },

  TOPICS: {
    WHEELCHAIR_REQUEST: (id) => `wheelchair/${id}/request`,
    WHEELCHAIR_COMMAND: (id) => `wheelchair/${id}/command`,
    WHEELCHAIR_STATUS: (id) => `wheelchair/${id}/status`,
    WHEELCHAIR_LOCATION: (id) => `wheelchair/${id}/location`,
    WHEELCHAIR_STATUS_ALL: 'wheelchair/+/status',
    WHEELCHAIR_LOCATION_ALL: 'wheelchair/+/location',
  },

  MESSAGE_TYPES: {
    MOVE_TO_LOCATION: 'move_to_location',
    OPEN_SEAT: 'open_seat',
    CLOSE_SEAT: 'close_seat',
    STOP: 'stop',
    RETURN_TO_DOCK: 'return_to_dock',
  },
};

export default MQTT_CONFIG;
