$(document).ready(() => {

    $("#btn-logout").on("click", () => {
        // Cache selectors
        const csrf = $("#hidden-csrf")
        initLogoutRequest()
    });

    async function initLogoutRequest() {
        const csrfToken = $("#hidden-csrf").val();
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken
            },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function (response) {
                alert(response.message);
                window.location = "/login";
            },
            error: function (xhr, status, error) {
                const errorMessage = xhr.responseJSON && xhr.responseJSON.message
                    ? xhr.responseJSON.message
                    : "An error occurred. Please try again.";
                alert(errorMessage)
            }
        });
    }
});

