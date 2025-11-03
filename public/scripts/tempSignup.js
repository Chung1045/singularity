$(document).ready(() => {

    $("#btn-signup").on("click", () => {
        // Cache selectors
        const csrf = $("#hidden-csrf")
        const $username = $("#input-username");
        const $email = $("#input-email");
        const $firstName = $("#input-firstName");
        const $lastName = $("#input-lastName");
        const $password = $("#input-password");
        const $confirmPassword = $("#input-confirmPassword");

        // Gather form data
        const formData = {
            username: $username.val(),
            email: $email.val(),
            firstName: $firstName.val(),
            lastName: $lastName.val(),
            password: $password.val(),
            confirmPassword: $confirmPassword.val()
        };

        console.log("Form Data:", formData); // debug

        // Check required fields
        const requiredFields = ["username", "email", "password", "confirmPassword"];
        const emptyFields = requiredFields.filter(field => !formData[field]);

        if (emptyFields.length > 0) {
            alert(`Please fill in: ${emptyFields.join(", ")}`);
            return;
        }

        // Check password match
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // Proceed with form submission (AJAX / fetch)
        alert("Form is valid! Ready to submit.");
        initSignupRequest(formData)
    });

    async function initSignupRequest(formData) {
        const csrfToken = $("#hidden-csrf").val();
        $.ajax({
            url: '/api/signup',
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken
            },
            data: JSON.stringify(formData),
            contentType: 'application/json',
            success: function (response) {
                alert(response.message);
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

