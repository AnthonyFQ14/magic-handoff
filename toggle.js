// toggle.js: hand Magic Keyboard + Trackpad between two Macs.
// Run the same script on both Macs:
//   osascript -l JavaScript ~/scripts/toggle.js
// If this Mac has the devices, it releases them (and forgets the pairing).
// If it doesn't, it takes them (re-pairing over Bluetooth, no cable).

ObjC.import('IOBluetooth');
ObjC.import('Foundation');

// Replace with your device addresses from:
//   system_profiler SPBluetoothDataType
const DEVICES = {
  'Keyboard': 'AA-BB-CC-DD-EE-FF',
  'Trackpad': '11-22-33-44-55-66',
};
const PAIR_TIMEOUT_SECONDS = 20;

const app = Application.currentApplication();
app.includeStandardAdditions = true;

function notify(msg) {
  try { app.displayNotification(msg, { withTitle: 'Peripheral Switch' }); } catch (e) {}
}

function getDevice(addr) {
  const dev = $.IOBluetoothDevice.deviceWithAddressString(addr);
  return dev && !dev.isNil() ? dev : null;
}

// Forget the device on this Mac (like "Forget This Device" in Settings).
// Uses IOBluetooth's private "remove" method, the same one Magic Switch uses.
function forget(dev) {
  try { dev.remove; return true; } catch (e) {}
  try { dev.performSelector('remove'); return true; } catch (e) {}
  return false;
}

// Pairing delegate: auto-accepts the confirmation prompt and records the result.
let pairDone = false;
let pairError = null;
ObjC.registerSubclass({
  name: 'PeripheralSwitchPairDelegate',
  superclass: 'NSObject',
  methods: {
    'devicePairingFinished:error:': {
      types: ['void', ['id', 'int']],
      implementation: function (sender, error) { pairError = error; pairDone = true; },
    },
    'devicePairingUserConfirmationRequest:numericValue:': {
      types: ['void', ['id', 'int']],
      implementation: function (sender, value) { sender.replyUserConfirmation(true); },
    },
  },
});

function pair(dev) {
  pairDone = false;
  pairError = null;
  const delegate = $.PeripheralSwitchPairDelegate.alloc.init;
  const devicePair = $.IOBluetoothDevicePair.pairWithDevice(dev);
  devicePair.setDelegate(delegate);
  if (devicePair.start !== 0) return false;

  const deadline = Date.now() + PAIR_TIMEOUT_SECONDS * 1000;
  while (!pairDone && Date.now() < deadline) {
    $.NSRunLoop.currentRunLoop.runModeBeforeDate(
      $.NSDefaultRunLoopMode, $.NSDate.dateWithTimeIntervalSinceNow(0.25));
  }
  if (!pairDone) { devicePair.stop; return false; }
  return pairError === 0;
}

function connect(dev) {
  for (let i = 0; i < 3; i++) {
    if (dev.isConnected) return true;
    if (dev.openConnection === 0 || dev.isConnected) return true;
    delay(1);
  }
  return dev.isConnected;
}

function release() {
  for (const addr of Object.values(DEVICES)) {
    const dev = getDevice(addr);
    if (!dev || !dev.isConnected) continue;
    if (!forget(dev)) dev.closeConnection;
  }
  notify('Released keyboard and trackpad');
}

function takeOne(addr) {
  let dev = getDevice(addr);
  if (!dev) return false;
  if (dev.isConnected) return true;

  // Fast path: this Mac still holds a valid pairing.
  if (dev.isPaired && dev.openConnection === 0) return true;

  // Pairing is stale (the "remove it" error): forget it and pair fresh.
  forget(dev);
  delay(1);
  dev = getDevice(addr);
  if (!dev) return false;
  return pair(dev) && connect(dev);
}

function take() {
  const failed = [];
  for (const [name, addr] of Object.entries(DEVICES)) {
    if (!takeOne(addr)) failed.push(name);
  }
  notify(failed.length
    ? 'Could not connect: ' + failed.join(', ') + '. Press a key or click it to wake it, then try again.'
    : 'Took keyboard and trackpad');
}

function run() {
  const anyConnected = Object.values(DEVICES).some(addr => {
    const dev = getDevice(addr);
    return dev && dev.isConnected;
  });
  if (anyConnected) release(); else take();
}
