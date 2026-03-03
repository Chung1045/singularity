(function () {
    const stop = `What are you doing here?`;
    const stop2 = `Fell off the track?`;
    const stop3 = `You seems to be lost.`;

    const red  = 'color:#dc2626;';
    const grey = 'color:#6b7280;';
    const bold = 'font-weight:700;';
    const base = 'font-size:14px; font-family:sans-serif; line-height:1.8;';

    console.log('%c' + stop, 'color:#ffffff; background:#dc2626; font-size:35px; font-family:monospace; font-weight:bold; line-height:1.35; padding:14px 18px;');
    console.log('%c' + stop2, 'color:#ffffff; background:#dc2626; font-size:35px; font-family:monospace; font-weight:bold; line-height:1.35; padding:14px 18px;');
    console.log('%c' + stop3, 'color:#ffffff; background:#dc2626; font-size:35px; font-family:monospace; font-weight:bold; line-height:1.35; padding:14px 18px;');
    console.log('%cThis browser feature is intended for developers only.', red + bold + base);
    console.log('%cIf someone told you to paste or type anything here,\nthey are attempting to compromise your account.', base);
    console.log('%cThis is called a Self-XSS attack. Do NOT run any code here\nunless you fully understand what it does.', red + bold + base);
    console.log('%cUnauthorised use of this console may violate applicable law\nand Singularity\'s Terms of Service. All suspicious activity is logged.', grey + 'font-size:12px; font-family:sans-serif; line-height:1.8;');
})();