const { useState } = React;

const TempSession = ({ csrfToken, sessions, loginAttempts }) => {
    console.log("Rendering TempSession with sessions:", sessions); // Debug

    const handleClearLoginAttempts = async () => {
        if (confirm("Are you sure you want to clear all the login attempt history?")) {
            const resp = await fetch("/api/loginAttempts/deleteAll", {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (resp.ok) {
                alert("Login Attempt History deleted");
                location.reload();
            } else {
                alert("Failed to delete login attempt history");
            }
        }
    }

    const handleSessionLogout = async (sessionID) => {
        if (confirm("Are you sure you want logout this session?")) {
            const resp = await fetch("/api/session/logout", {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({sessionID: sessionID})
            });

            if (resp.ok) {
                alert("Session have been removed and logged out");
                location.reload();
            } else {
                alert("Failed to logout the session");
            }
        }
    }

    const sessionElements = sessions.map((session) => {
        // Safety: ensure key exists
        const keyID = session.sessionID;

        return React.createElement(
            "div",
            {
                key: keyID,
                className: "flex items-center justify-between border border-gray-300 rounded p-3 mt-3",
            },
            React.createElement(
                "div",
                null,
                React.createElement("h3", { className: "font-semibold text-lg" }, session.sessionOS),
                React.createElement("p", { className: "text-gray-600 text-sm" }, session.lastSeenTime)
            ),
            React.createElement(
                "button",
                {
                    className: "bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600",
                    onClick: () => handleSessionLogout(keyID)
                },
                "Logout this session"
            )
        );
    });

    const loginAttemptElement = loginAttempts.map((attempt) => {
        const keyID = attempt.attemptID;

        return React.createElement(
            "div",
            {
                key: keyID,
                className: "flex items-center justify-between border border-gray-300 rounded p-3 mt-3",
            },
            React.createElement(
                "div",
                null,
                React.createElement("h3", { className: "font-semibold text-lg" }, attempt.attemptIP),
                React.createElement("p", { className: "text-gray-600 text-sm" }, attempt.attemptBrowser),
                React.createElement("p", { className: "text-gray-600 text-sm" }, attempt.attemptOS),
                React.createElement("p", { className: "text-gray-600 text-sm" }, attempt.attemptDate)
            ),
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

        React.createElement("h2", { className: "text-xl font-semibold mb-2" }, "Manage Sessions"),

        sessionElements,

        React.createElement("h2", { className: "text-xl font-semibold mb-2" }, "Login attempts"),

        loginAttempts.length > 0
            ? React.createElement(
                "button",
                {
                    className: "bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600",
                    onClick: handleClearLoginAttempts
                },
                "Clear Login Attempts History"
            )
            : React.createElement("p", { className: "text-gray-600 text-sm" }, "No record"),  // ✅ Added comma here

        loginAttemptElement  // ✅ Now properly separated

    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TempSession;
}

window.TempSession = TempSession;
