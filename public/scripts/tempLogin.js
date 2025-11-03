$(document).ready(() => {

    $("#btn-login").on("click", () => {
        // Cache selectors
        const csrf = $("#hidden-csrf")
        const $usernameEmail = $("#input-usernameEmail");
        const $password = $("#input-password");

        // Gather form data
        const formData = {
            usernameEmail: $usernameEmail.val(),
            password: $password.val(),
        };

        console.log("Form Data:", formData); // debug

        // Check required fields
        const requiredFields = ["usernameEmail", "password"];
        const emptyFields = requiredFields.filter(field => !formData[field]);

        if (emptyFields.length > 0) {
            alert(`Please fill in: ${emptyFields.join(", ")}`);
            return;
        }

        // Proceed with form submission (AJAX / fetch)
        alert("Form is valid! Ready to submit.");
        initLoginRequest(formData)
    });

    $("#btn-googleOAuth").on("click", () => {
        // Cache selectors
        const csrf = $("#hidden-csrf")
        window.location.href = "api/auth/google"
    });

    $("#btn-signup").on("click", () => {
        // Cache selectors
        const csrf = $("#hidden-csrf")
        window.location.href = "signup"
    });

    async function initLoginRequest(formData) {
        const csrfToken = $("#hidden-csrf").val();
        $.ajax({
            url: '/api/login',
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken
            },
            data: JSON.stringify(formData),
            contentType: 'application/json',
            success: function (response) {
                alert(response.message);
                window.location = "/home";
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

