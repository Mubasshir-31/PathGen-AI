print("--- THIS IS THE CORRECT PATHGEN AI FILE ---")
import os
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from dotenv import load_dotenv
from flask_mail import Mail, Message # type: ignore
import re

# Load environment variables from .env file
load_dotenv()

# Initialize the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'devsecret')

# Configure Flask-Mail
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = 'connect.learnify@gmail.com'
mail = Mail(app)

# Configure the Gemini API key
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
except KeyError:
    print("Error: GEMINI_API_KEY not found. Please set it in your .env file.")
    exit()

# Function to generate the prompt for the AI
def create_prompt(goal, age, time_available, skill_level):
    return f"""
    Generate a detailed, step-by-step career roadmap for a user with the following details:
    - Dream Goal: "{goal}"
    - Current Age: {age}
    - Time Available: "{time_available}"
    - Current Skill Level: "{skill_level}"

    Structure the output in clear, logical sections (e.g., "Month 1-3," "Phase 1").
    For each section, provide:
    1.  **Actionable Steps:** Specific tasks, topics to learn, or mini-projects.
    2.  **Recommended Resources:** A list of specific books, online courses (like on Coursera, Udemy), or free tutorials (YouTube channels, blogs).
    
    Ensure the plan is realistic and tailored to the user's inputs. Format the entire output using Markdown.
    Start with a short, encouraging introductory paragraph.
    """

# Route for the main page
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle the roadmap generation
@app.route('/generate', methods=['POST'])
def generate_roadmap():
    try:
        data = request.get_json()
        
        # Create the prompt
        prompt = create_prompt(
            goal=data.get('dreamGoal'),
            age=data.get('age'),
            time_available=data.get('timeAvailable'),
            skill_level=data.get('skillLevel')
        )

        # Call the Gemini API
        # Use a current and valid model name
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        # Store roadmap in session and redirect
        session['roadmap'] = response.text
        return jsonify({'redirect': url_for('roadmap')})

    except Exception as e:
        print(f"Error during generation: {e}")
        return jsonify({'error': 'Failed to generate roadmap. Please try again.'}), 500

@app.route('/roadmap')
def roadmap():
    roadmap = session.get('roadmap')
    if not roadmap:
        return redirect(url_for('index'))
    return render_template('roadmap.html', roadmap=roadmap)

# Route to handle emailing the roadmap
@app.route('/email', methods=['POST'])
def email_roadmap():
    try:
        data = request.get_json()
        email = data.get('email')
        roadmap_html = data.get('roadmap')
        if not email or not roadmap_html or not roadmap_html.strip():
            print(f"Email or roadmap missing. Email: {email}, Roadmap: {roadmap_html}")
            return jsonify({'error': 'Missing email or roadmap content.'}), 400
        # Strip HTML tags for plain text
        roadmap_text = re.sub('<[^<]+?>', '', roadmap_html)
        print(f"Sending roadmap to {email}. Preview: {roadmap_text[:100]}")
        msg = Message('Your PathGen AI Career Roadmap', recipients=[email])
        msg.body = roadmap_text
        msg.html = roadmap_html
        try:
            mail.send(msg)
        except Exception as mail_err:
            print(f"Flask-Mail error: {mail_err}")
            return jsonify({'error': f'Failed to send email: {mail_err}'}), 500
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({'error': f'Failed to send email: {e}'}), 500

# Run the app
if __name__ == '__main__':
    app.run(debug=True)