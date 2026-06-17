// MQTT Configuration (defaults can be overridden via .env)
const MQTT_CONFIG = {
  BROKER_HOST: process.env.REACT_APP_MQTT_HOST || 'broker.hivemq.com',
  BROKER_PORT: parseInt(process.env.REACT_APP_MQTT_PORT || '8883', 10),
  BROKER_PROTOCOL: process.env.REACT_APP_MQTT_PROTOCOL || 'mqtt',
  USERNAME: process.env.REACT_APP_MQTT_USERNAME || 'wheelchair',
  PASSWORD: process.env.REACT_APP_MQTT_PASSWORD || '',

  getBrokerUrl() {
    return `${this.BROKER_PROTOCOL}://${this.BROKER_HOST}:${this.BROKER_PORT}`;
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
