// TS Check: list of instruments offered in "Field check > 1 Instrument".
// Choosing one fills the fields below it; they stay editable, and "Manual entry" keeps typing by hand.
// Fields (all optional, as text): brand, model, serial, inventory, firmware,
// sigma (angular accuracy, ″), edmA (EDM constant, mm), edmB (EDM ppm), prism.
// Example:
//   {brand:"Leica", model:"TS16 I 1\"", serial:"1234567", inventory:"TS-01", sigma:"1", edmA:"1", edmB:"1.5", prism:"GPR1, 0 mm"},
// After editing this file, bump VERSION in sw.js and APP_VERSION in app.js so installed phones update.
window.INSTRUMENTS = [
  {brand:"Leica",   model:"MS60",    serial:"887367",   sigma:"1",   edmA:"1",   edmB:"1.5"},
  {brand:"Leica",   model:"TS60",    serial:"890222",   sigma:"0.5", edmA:"0.6", edmB:"1"},
  {brand:"Leica",   model:"TS60",    serial:"897479",   sigma:"0.5", edmA:"0.6", edmB:"1"},
  {brand:"Topcon",  model:"GT-1001", serial:"UQ007918", sigma:"1",   edmA:"1",   edmB:"2"},
  {brand:"Topcon",  model:"GT-1001", serial:"UQ010299", sigma:"1",   edmA:"1",   edmB:"2"},
  {brand:"Topcon",  model:"GT-1001", serial:"UQ010748", sigma:"1",   edmA:"1",   edmB:"2"},
  {brand:"Topcon",  model:"PS-201",  serial:"MK000410", sigma:"1",   edmA:"1.5", edmB:"2"},
];
