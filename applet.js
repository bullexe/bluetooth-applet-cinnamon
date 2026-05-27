const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const GLib = imports.gi.GLib;

function MyApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
        try {
            Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);
            this.set_applet_icon_name("bluetooth-active");
            this.set_applet_tooltip("Bluetooth integrado");

            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager.addMenu(this.menu);

            this._isScanning = false;
            this._bluetoothEnabled = this._getBluetoothEnabled();
            this._buildMenu();
        } catch (e) {
            global.logError("Bluetooth Applet: erro no init: " + e.message);
        }
    },

    _log: function(message) {
        global.log("Bluetooth Applet: " + message);
    },

    _error: function(message, error) {
        global.logError("Bluetooth Applet: " + message + (error ? " - " + error.message : ""));
    },

    _getBluetoothEnabled: function() {
        try {
            let [success, output] = GLib.spawn_command_line_sync("rfkill list bluetooth");
            if (!success || !output) {
                return false;
            }

            return output.toString().match(/Soft blocked:\s*no/i) !== null;
        } catch (e) {
            this._error("Falha ao verificar o estado do Bluetooth", e);
            return false;
        }
    },

    _runShellCommand: function(command) {
        try {
            GLib.spawn_command_line_async(command);
        } catch (e) {
            this._error("Falha ao executar comando", e);
        }
    },

    _connectDevice: function(dev) {
        if (!dev || !dev.mac) {
            return;
        }

        try {
            let command = `bash -lc "printf 'agent on\\ndefault-agent\\npair ${dev.mac}\\ntrust ${dev.mac}\\nconnect ${dev.mac}\\nquit\\n' | bluetoothctl"`;
            this._runShellCommand(command);
            this.set_applet_tooltip("Tentando conectar a " + dev.name + "...");
        } catch (e) {
            this._error("Falha ao conectar dispositivo " + dev.mac, e);
        }
    },

    _getDevices: function() {
        let devices = [];

        try {
            let [res, out] = GLib.spawn_command_line_sync("bluetoothctl devices");
            if (res && out) {
                let lines = out.toString().trim().split('\n');
                for (let line of lines) {
                    let match = line.match(/^Device\s+([0-9A-F:]{17})\s+(.*)$/i);
                    if (match) {
                        devices.push({ mac: match[1], name: match[2] });
                    }
                }
            }
        } catch (e) {
            this._error("Erro ao listar dispositivos", e);
        }

        return devices;
    },

    _buildMenu: function() {
        this.menu.removeAll();

        this._bluetoothEnabled = this._getBluetoothEnabled();
        this.set_applet_icon_name(this._bluetoothEnabled ? "bluetooth-active" : "bluetooth-disabled");
        this.set_applet_tooltip(this._bluetoothEnabled ? "Bluetooth ativo" : "Bluetooth desativado");

        let switchItem = new PopupMenu.PopupSwitchMenuItem("Bluetooth", this._bluetoothEnabled);
        switchItem.connect('toggled', (item, state) => {
            let cmd = state ? "rfkill unblock bluetooth" : "rfkill block bluetooth";
            this._runShellCommand(cmd);
            this._bluetoothEnabled = state;
            this.set_applet_icon_name(state ? "bluetooth-active" : "bluetooth-disabled");
            this.set_applet_tooltip(state ? "Bluetooth ativo" : "Bluetooth desativado");
        });
        this.menu.addMenuItem(switchItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let scanLabel = this._isScanning ? "Buscando dispositivos..." : "Procurar dispositivos próximos";
        let scanIcon = this._isScanning ? "view-refresh-symbolic" : "edit-find-symbolic";
        let scanItem = new PopupMenu.PopupIconMenuItem(scanLabel, scanIcon, St.IconType.SYMBOLIC);

        scanItem.connect('activate', () => {
            if (this._isScanning) {
                return;
            }

            this._isScanning = true;
            this._buildMenu();
            this._runShellCommand("bash -lc 'bluetoothctl --timeout 15 scan on'");

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16000, () => {
                this._isScanning = false;
                if (this.menu.isOpen) {
                    this._buildMenu();
                }
                return false;
            });
        });

        this.menu.addMenuItem(scanItem);

        let refreshItem = new PopupMenu.PopupIconMenuItem("Atualizar dispositivos", "view-refresh-symbolic", St.IconType.SYMBOLIC);
        refreshItem.connect('activate', () => {
            this._buildMenu();
        });
        this.menu.addMenuItem(refreshItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let devices = this._getDevices();
        if (devices.length > 0) {
            devices.forEach(dev => {
                let devItem = new PopupMenu.PopupIconMenuItem(dev.name, "bluetooth-active-symbolic", St.IconType.SYMBOLIC);
                devItem.connect('activate', () => {
                    this._connectDevice(dev);
                });
                this.menu.addMenuItem(devItem);
            });
        } else {
            let info = new PopupMenu.PopupMenuItem("Nenhum dispositivo encontrado", { reactive: false });
            this.menu.addMenuItem(info);
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addAction("Configurações do Bluetooth", () => {
            this._runShellCommand("cinnamon-settings bluetooth");
        });
    },

    on_applet_clicked: function() {
        this._buildMenu();
        this.menu.toggle();
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new MyApplet(metadata, orientation, panel_height, instance_id);
}
