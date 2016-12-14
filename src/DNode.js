class DNode {
  constructor(config, node, RED) {
    this.config = config;
    this.node = node;
    this.RED = RED;
  }

  static createNode(name, cb) {
    return (RED) => {
      RED.nodes.registerType(name, function NODE(config) {
        RED.nodes.createNode(this, config);
        const dnode = new DNode(config, this, RED);
        dnode.setStatus();
        try {
          cb(dnode);
        } catch (e) {
          dnode.setStatus('red', e.message);
        }
      });
    };
  }

  getConfig(key) {
    const value = this.config[key];
    if (!value) {
      throw new Error(`missing config '${key}'`);
    }
    return value;
  }

  getConfigs(keys) {
    const values = {};
    keys.forEach((key) => {
      values[key] = this.getConfig(key);
    });
    return values;
  }

  setServices(services) {
    this.node.services = services;
  }

  getServices(key) {
    const node = this.RED.nodes.getNode(this.getConfig(key));
    if (!node) {
      throw new Error(`missing node '${key}'`);
    }
    const services = node.services;
    if (!services) {
      throw new Error(`missing services for node '${key}'`);
    }
    return services;
  }

  setStatus(fill, text) {
    let status;
    if (fill) {
      status = { fill, shape: 'dot', text };
    } else {
      status = {};
    }
    this.node.status(status);
    this.statusSet = true;
  }

  sendMessage(msg) {
    this.node.send(msg);
  }

  onInput(cb) {
    this.node.on('input', async (msg) => {
      this.setStatus('grey', 'processing...');
      try {
        this.statusSet = false;
        await cb(msg);
        if (!this.statusSet) {
          this.setStatus();
        }
      } catch (e) {
        this.setStatus('yellow', e.message);
      }
    });
  }

  onTick(interval, cb) {
    let timeoutHandle;
    this.node.on('close', () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    });
    async function TICK() {
      try {
        await cb();
      } catch (e) {
        this.setStatus('yellow', e.message);
      }
      timeoutHandle = setTimeout(TICK, interval * 1000);
    }
    process.nextTick(TICK);
  }
}

module.exports = DNode;
