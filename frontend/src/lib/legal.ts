// Legal URLs shown in-app. Apple gates on both of these existing and working:
// 5.1.1 wants a privacy policy, and 3.1.2 wants terms wherever an
// auto-renewable subscription is sold.
export const PRIVACY_URL = "https://getotterly.com/privacy";

// Apple's standard EULA. getotterly.com/terms does not exist -- it falls
// through to the marketing homepage -- and Apple explicitly permits linking
// this instead of writing your own. Swap this for a real /terms page if one is
// ever published; nothing else needs to change.
export const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
