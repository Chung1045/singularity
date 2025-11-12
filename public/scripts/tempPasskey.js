const { useState } = React;

async function registerPasskey() {
    const csrfToken = document.querySelector('#hidden-csrf')?.value;
    console.log("Running")
    if (!csrfToken) {
        alert("CSRF token missing!");
        return;
    }

    const { startRegistration, browserSupportsWebAuthn } = window.SimpleWebAuthnBrowser;

    if (!browserSupportsWebAuthn) {
        alert("This browser does not support passkey")
        return
    }
    try {
        const resp = await fetch('/api/passkey/gen-option', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({})
        });

        if (!resp.ok) throw new Error("Failed to get registration options");

        const options = await resp.json();

        const attResp = await startRegistration(options);
        console.log("Attestation response:", attResp);

        const verificationResp = await fetch('/api/passkey/verify-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(attResp)
        });

        const verificationJSON = await verificationResp.json();

        if (verificationResp.ok) {
            alert("Passkey registered successfully!");
            location.reload();
        } else {
            alert("Registration failed: " + (verificationJSON.error || "Unknown error"));
        }
    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    }
}

async function deletePasskey(passkeyID) {
    try {
        console.log("PasskeyID: " + passkeyID);

        const resp = await fetch("/api/passkey/delete", {
            method: 'POST',                     // changed from DELETE
            headers: {
                'CSRF-Token': csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ passkeyID })
        });

        if (resp.ok) {
            alert("Passkey deleted");
            location.reload();   // or remove from state for smoother UX
        } else {
            alert("Failed to delete passkey");
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
}


const TempPasskey = ({ csrfToken, passkeys }) => {
    console.log("Rendering TempPasskey with passkeys:", passkeys); // Debug

    const passkeyElements = passkeys.map((passkey) => {
        // Safety: ensure key exists
        const keyID = passkey.keyID;

        return React.createElement(
            "div",
            {
                key: keyID,
                className: "flex items-center justify-between border border-gray-300 rounded p-3 mt-3",
            },
            React.createElement(
                "div",
                null,
                React.createElement("h3", { className: "font-semibold text-lg" }, passkey.keyName || "Unnamed"),
                React.createElement("p", { className: "text-gray-600 text-sm" }, passkey.dateCreate || "Unknown date")
            ),
            React.createElement(
                "button",
                {
                    className: "bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600",
                    onClick: () => deletePasskey(keyID),
                },
                "Delete"
            )
        );
    });

    return React.createElement(
        "div",
        { className: "flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8" },

        // Hidden CSRF
        React.createElement("input", {
            type: "hidden",
            name: "_csrf",
            id: "hidden-csrf",
            value: csrfToken,
        }),

        React.createElement("h2", { className: "text-xl font-semibold mb-2" }, "Manage Passkeys"),

        React.createElement(
            "button",
            {
                className: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-fit",
                onClick: () => registerPasskey()
            },
            "Register New Passkey"
        ),

        passkeyElements

    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TempPasskey;
}

window.TempPasskey = TempPasskey;
