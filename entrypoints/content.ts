export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Side Door content script loaded');
  },
});