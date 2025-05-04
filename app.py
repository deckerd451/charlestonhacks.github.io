from flask import Flask, request
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

app = Flask(__name__)

SENDGRID_API_KEY = 'YOUR_SENDGRID_API_KEY'
FROM_EMAIL = 'youremail@yourdomain.com'

@app.route("/register", methods=["POST"])
def register():
    email = request.form.get("email")
    firstname = request.form.get("first-name")
    lastname = request.form.get("last-name")
    

    if email:
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=email,
            subject='Subscription Confirmed',
            html_content=f'<strong>Hi {firstname} {lastname},<br><br>Thank you for subscribing to our mailing list!</strong><br>Your skills: {skills}'
        )
        try:
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            response = sg.send(message)
            print(response.status_code)
            return "Thank you for registering. Confirmation email sent!"
        except Exception as e:
            print(e)
            return "Failed to send email."

    return "Invalid email."

if __name__ == "__main__":
    app.run(debug=True)