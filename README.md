# magic-handoff

Switch an Apple Magic Keyboard and Magic Trackpad (or Magic Mouse) between two Macs with one keyboard shortcut. No apps to install, no cables to swap.

## Who this is for

You have a personal Mac and a work Mac on the same desk, and you want to use one set of Magic peripherals with both. Your work Mac is managed by IT: you can't install apps, admin rights are locked down, and anything that runs a background service or opens a network port is off the table.

magic-handoff is built for exactly that setup. It's a single script that uses only what already ships with macOS, so it runs on a locked-down work Mac the same way it runs on your personal one. Press a hotkey, and your keyboard and trackpad move to the other Mac.

## The problem

Magic Keyboard, Magic Trackpad, and Magic Mouse only stay paired to one Mac at a time. The device stores a pairing key for a single host, so when you pair it with Mac A, Mac B's pairing goes stale. If you then try to connect from Mac B, it fails and macOS tells you that you have to remove the device first.

The usual workaround is to plug the device into whichever Mac you want to use with a Lightning or USB-C cable, every single time you switch.

**Why not Universal Control?** Universal Control only works when both Macs are signed into the same Apple ID. A personal Mac and a work Mac almost never are, so it doesn't help here.

**Why not an app?** Apps like [Magic Switch](https://github.com/MegaManSec/magic-switch) solve this well, but they need to be installed on both Macs and run a network listener so the Macs can talk to each other. Managed work Macs often block installing apps or opening network listeners.

## How it works

You run the same script, bound to the same hotkey, on both Macs. It figures out what to do on its own:

* **If this Mac has the devices connected, it releases them.** It forgets the pairing on this Mac (the same as "Forget This Device" in Bluetooth settings), which frees the device for the other Mac.
* **If this Mac has none of them connected, it takes them.** It first tries a normal connect. If the pairing is stale, it deletes the stale record, pairs fresh over Bluetooth (auto-accepting the confirmation), and connects.

## Why this approach

* **Nothing to install.** It's one JavaScript for Automation (JXA) file run by `osascript`, using Apple's built-in IOBluetooth framework. No Homebrew, no app, no admin rights.
* **Works on locked-down work Macs** where installing apps is blocked.
* **No background process.** It runs only when you press the hotkey, then exits. No battery drain.
* **No network connection between the Macs.** No open ports, no listener, nothing for IT security tools to flag. Each Mac acts on its own.

## Setup

Do these steps on **both** Macs.

### 1. Find your device addresses

```sh
system_profiler SPBluetoothDataType | grep -B1 -A6 -iE "keyboard|trackpad|mouse"
```

Look for the `Address:` line under each device (it looks like `AA:BB:CC:DD:EE:FF`). The script accepts it with dashes, for example `AA-BB-CC-DD-EE-FF`.

### 2. Download the script

```sh
mkdir -p ~/scripts && curl -fsSL https://raw.githubusercontent.com/AnthonyFQ14/magic-handoff/main/toggle.js -o ~/scripts/toggle.js
```

### 3. Add your addresses

Open `~/scripts/toggle.js` and replace the two placeholder addresses in `DEVICES`:

```js
const DEVICES = {
  'Keyboard': 'AA-BB-CC-DD-EE-FF',
  'Trackpad': '11-22-33-44-55-66',
};
```

The addresses belong to the devices, not the Macs, so they're the same on both Macs. Using a Magic Mouse? Add it as another entry, for example `'Mouse': '77-88-99-AA-BB-CC',`.

### 4. Test it from Terminal

```sh
osascript -l JavaScript ~/scripts/toggle.js
```

### 5. Bind it to a hotkey with Shortcuts

1. Open the **Shortcuts** app, go to **Shortcuts > Settings > Advanced**, and turn on **Allow Running Scripts**.
2. Create a new shortcut.
3. Add a **Run Shell Script** action (shell: `zsh`) containing:
   ```sh
   osascript -l JavaScript ~/scripts/toggle.js
   ```
4. Click the **(i) Shortcut Details** button, then **Add Keyboard Shortcut**.
5. Use the same hotkey on both Macs, for example **Control + Option + Command + B**.

The first time it runs, macOS asks for Bluetooth permission. Approve it.

### 6. First-time reset

Plug the devices into one of the Macs with a cable for a few seconds, then unplug them. This gives them a clean starting state.

## Usage

1. **On the Mac that has the devices,** press the hotkey. It releases them.
2. **Wake the devices** with a key press and a click.
3. **On the other Mac,** press the hotkey using its built-in keyboard. It takes them. Pairing can take several seconds per device.

The Mac taking the devices needs another way to press the hotkey, since the Magic Keyboard isn't connected to it yet. A laptop's built-in keyboard is perfect for this, which makes magic-handoff a natural fit for a laptop (say, your work MacBook) plus a desk setup.

## Troubleshooting

* **"Could not connect"** usually means the other Mac hasn't released the devices yet, or a device fell asleep. Wake it with a key press or click and try again.
* **Run it from Terminal** (`osascript -l JavaScript ~/scripts/toggle.js`) to see any errors.
* **If things get stuck,** plug the device into the Mac you want to use with a cable for a few seconds. That resets the pairing.

## Limitations and caveats

* **It uses a private API.** Forgetting a device relies on IOBluetooth's private `remove` method. A future macOS update could break it.
* **Some managed (MDM) Macs block it.** Your IT policy may block pairing new Bluetooth devices or running scripts in Shortcuts. If so, a USB switch is the reliable alternative.
* **Check your employer's policy** before using it on a work machine.
* **Tested on:** macOS 27.

## Credit

The release and re-pair approach (forget on the releasing Mac, pair fresh on the taking Mac) is modeled on how [Magic Switch](https://github.com/MegaManSec/magic-switch) by Joshua Rogers handles handoffs. No code was copied; magic-handoff is an independent JXA implementation of the same idea.

If you can install apps on both Macs, Magic Switch is the more full-featured option. Go check it out.

## License

[MIT](LICENSE)
