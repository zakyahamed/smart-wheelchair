import mqtt from 'mqtt/dist/mqtt';

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.clientId = `wheelchair-app-${Math.random().toString(16).slice(2)}`;
    this.listeners = new Map();
  }

  async connect(brokerUrl, options = {}) {
    if (this.client) return this.isConnected;

    const opts = {
      clientId: this.clientId,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 4000,
      ...options,
    };

    this.client = mqtt.connect(brokerUrl, opts);

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('[MQTT] connected');
    });

    this.client.on('error', (err) => {
      console.error('[MQTT] error', err);
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      console.log('[MQTT] reconnecting');
    });

    this.client.on('message', (topic, message) => {
      const payload = message.toString();
      let data = payload;
      try { data = JSON.parse(payload); } catch (e) {}

      // dispatch to listeners
      this.listeners.forEach((callbacks, subscribedTopic) => {
        if (this.topicMatches(topic, subscribedTopic)) {
          callbacks.forEach((cb) => cb(data, topic));
        }
      });
    });

    // wait a short time for connect
    await new Promise((res) => setTimeout(res, 500));
    return this.isConnected;
  }

  disconnect() {
    if (this.client) {
      try { this.client.end(); } catch (e) {}
      this.client = null;
      this.isConnected = false;
    }
  }

  publish(topic, message, options = {}) {
    if (!this.client || !this.isConnected) {
      return Promise.reject(new Error('MQTT not connected'));
    }
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, options, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  subscribe(topic, callback, options = {}) {
    if (!this.client) return false;
    if (!this.listeners.has(topic)) this.listeners.set(topic, []);
    this.listeners.get(topic).push(callback);
    this.client.subscribe(topic, options, (err) => {
      if (err) console.error('[MQTT] subscribe error', err);
    });
    return true;
  }

  unsubscribe(topic, callback = null) {
    if (!this.client) return false;
    if (callback && this.listeners.has(topic)) {
      const arr = this.listeners.get(topic).filter((cb) => cb !== callback);
      if (arr.length) this.listeners.set(topic, arr); else this.listeners.delete(topic);
    } else {
      this.listeners.delete(topic);
    }
    this.client.unsubscribe(topic, (err) => { if (err) console.error('[MQTT] unsubscribe error', err); });
    return true;
  }

  topicMatches(received, pattern) {
    if (pattern === received) return true;
    const r = received.split('/');
    const p = pattern.split('/');
    for (let i = 0; i < p.length; i++) {
      if (p[i] === '#') return true;
      if (p[i] === '+') continue;
      if (p[i] !== r[i]) return false;
    }
    return p.length === r.length;
  }

  isConnectedToMQTT() { return this.isConnected; }
}

let instance = null;
export const getMQTTInstance = () => { if (!instance) instance = new MQTTService(); return instance; };
export default MQTTService;
