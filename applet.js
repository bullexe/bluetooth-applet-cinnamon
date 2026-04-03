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
            this.set_applet_tooltip("Bluetooth Integrado");

            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager.addMenu(this.menu);

            this._isScanning = false;
            this._buildMenu();
        } catch (e) {
            global.logError("Erro no Init: " + e.message);
        }
    },

    // ✅ FUNÇÃO FINAL DE CONEXÃO (com sessão real)
    _connectDevice(dev) {
        if (!dev || !dev.mac)
            return;

        try {
            let cmd = `
            bash -c '
            bluetoothctl <<EOF
            agent on
            default-agent
            pair ${dev.mac}
            trust ${dev.mac}
            connect ${dev.mac}
            quit
EOF
            '`;

            GLib.spawn_command_line_async(cmd);

            this.set_applet_tooltip("Tentando conectar...");

        } catch (e) {
            logError(e);
        }
    },

    _getDevices: function() {
        let devices = [];
        try {
            let [res, out] = GLib.spawn_command_line_sync("bluetoothctl devices");
            if (res && out) {
                let lines = out.toString().split('\n');
                for (let line of lines) {
                    let match = line.match(/^Device\s+([0-9A-F:]{17})\s+(.*)$/i);
                    if (match) {
                        devices.push({ mac: match[1], name: match[2] });
                    }
                }
            }
        } catch (e) {
            global.log("Erro ao listar: " + e.message);
        }
        return devices;
    },

    _buildMenu: function() {
        this.menu.removeAll();

        let switchItem = new PopupMenu.PopupSwitchMenuItem("Bluetooth", true);
        switchItem.connect('toggled', (item, state) => {
            let cmd = state ? "rfkill unblock bluetooth" : "rfkill block bluetooth";
            GLib.spawn_command_line_async(cmd);
        });
        this.menu.addMenuItem(switchItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let scanLabel = this._isScanning ? "Buscando novos aparelhos..." : "Procurar Dispositivos Próximos";
        let scanIcon = this._isScanning ? "view-refresh-symbolic" : "edit-find-symbolic";
        let scanItem = new PopupMenu.PopupIconMenuItem(scanLabel, scanIcon, St.IconType.SYMBOLIC);
        
        scanItem.connect('activate', () => {
            if (this._isScanning) return;

            this._isScanning = true;
            this._buildMenu();

            GLib.spawn_command_line_async("bluetoothctl --timeout 15 scan on");
            
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 15500, () => {
                this._isScanning = false;
                if (this.menu.isOpen) this._buildMenu();
                return false;
            });
        });

        this.menu.addMenuItem(scanItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let devices = this._getDevices();

        if (devices.length > 0) {
            devices.forEach(dev => {
                let devItem = new PopupMenu.PopupIconMenuItem(
                    dev.name,
                    "bluetooth-active-symbolic",
                    St.IconType.SYMBOLIC
                );

                devItem.connect('activate', () => {
                    this._connectDevice(dev);
                    this.set_applet_tooltip("Conectando a " + dev.name + "...");
                });

                this.menu.addMenuItem(devItem);
            });
        } else {
            let info = new PopupMenu.PopupMenuItem("Nenhum dispositivo encontrado", { reactive: false });
            this.menu.addMenuItem(info);
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addAction("Configurações do Sistema", () => {
            GLib.spawn_command_line_async("cinnamon-settings bluetooth");
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