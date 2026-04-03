# bluetooth-applet-cinnamon
A simple, modern and lightweight Bluetooth applet for Cinnamon

# 🔵 Bluetooth Applet for Cinnamon

A simple and lightweight Bluetooth applet for Cinnamon, inspired by the behavior of Windows and GNOME.

## ✨ Features

* Enable / disable Bluetooth
* Scan nearby devices
* Pair devices
* Connect automatically
* Fully integrated into the system panel

## 📸 Screenshot

<img width="1920" height="1080" alt="Print1" src="https://github.com/bullexe/bluetooth-applet-cinnamon/blob/main/Print1.png" />


## ⚙️ Requirements

* Linux Mint / Cinnamon
* BlueZ (`bluetoothctl`)
* Bluetooth enabled
* (Maybe you have to install blueman  sudo apt-get blueman)

## 📦 Installation

1. Clone the repository:

```
git clone https://github.com/bullexe/bluetooth-applet-cinnamon.git
```

2. Copy it to the Cinnamon applets directory:

```
cp -r bluetooth-applet-cinnamon ~/.local/share/cinnamon/applets/bluetooth-applet@joaopaulo
```

3. Restart Cinnamon:

```
cinnamon --replace
```

or press:

```
CTRL + ALT + ESC
```

4. Add the applet to your panel

---

## ⚠️ Notes

* Some devices require manual confirmation for pairing
* Behavior may vary depending on Bluetooth drivers

---

## 🤝 Contributing

Pull requests are welcome!

Feel free to improve:

* UI / UX
* DBus integration
* Real-time device status

---

## 👨‍💻 Author

João Paulo

