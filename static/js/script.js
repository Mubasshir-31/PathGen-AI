document.addEventListener('DOMContentLoaded', () => {
    // --- Form Submission ---
    const form = document.getElementById('roadmapForm');
    const generateBtn = document.getElementById('generateBtn');
    const loadingDiv = document.getElementById('loading');
    const roadmapOutput = document.getElementById('roadmapOutput');
    const roadmapContent = document.getElementById('roadmapContent');
    const errorMsg = document.getElementById('errorMsg');

    if (form && generateBtn && loadingDiv && roadmapOutput && roadmapContent && errorMsg) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default page reload

            // 1. Get form data (match backend keys)
            const formData = {
                dreamGoal: document.getElementById('dreamGoal').value,
                age: document.getElementById('age').value,
                timeAvailable: document.getElementById('timeAvailable').value,
                skillLevel: document.getElementById('skillLevel').value,
            };

            // 2. Show loading indicator, hide previous results and errors
            loadingDiv.classList.remove('hidden');
            roadmapOutput.classList.add('hidden');
            errorMsg.classList.add('hidden');
            errorMsg.textContent = '';
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';

            try {
                // 3. Send data to the backend API
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                
                if (data.redirect) {
                    window.open(data.redirect, '_blank');
                    return;
                }
                if (data.error) {
                    throw new Error(data.error);
                }

                // 4. Display the generated roadmap (legacy fallback)
                displayRoadmap(data.roadmap);
                roadmapOutput.classList.remove('hidden');

            } catch (error) {
                errorMsg.textContent = `Error: ${error.message}`;
                errorMsg.classList.remove('hidden');
                errorMsg.classList.remove('text-green-600', 'dark:text-green-400');
                errorMsg.classList.add('text-red-600', 'dark:text-red-400');
                roadmapOutput.classList.add('hidden');
            } finally {
                // 5. Hide loading indicator and re-enable button
                loadingDiv.classList.add('hidden');
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate My Roadmap';
            }
        });

        // --- Function to Display Roadmap and Add Checkboxes ---
        function displayRoadmap(markdownText) {
            // Use the 'marked' library to convert Markdown to HTML
            let htmlContent = marked.parse(markdownText);
            // Add checkboxes to list items (tasks) for the progress dashboard
            htmlContent = htmlContent.replace(/<li>/g, '<li><input type="checkbox" class="task-checkbox mr-2"> ');
            roadmapContent.innerHTML = htmlContent;
        }
    }

    // --- Download as PDF ---
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn && roadmapContent && errorMsg) {
        downloadPdfBtn.addEventListener('click', async () => {
            if (!roadmapContent || roadmapContent.innerText.trim() === '' || roadmapContent.parentElement.classList.contains('hidden')) {
                errorMsg.textContent = 'No roadmap to download. Please generate one first.';
                errorMsg.classList.remove('hidden');
                errorMsg.classList.remove('text-green-600', 'dark:text-green-400');
                errorMsg.classList.add('text-red-600', 'dark:text-red-400');
                return;
            }
            // Temporarily remove dark mode for export
            const html = document.documentElement;
            const hadDark = html.classList.contains('dark');
            if (hadDark) html.classList.remove('dark');
            // Wait for DOM to update
            await new Promise(res => setTimeout(res, 200));
            try {
                await html2pdf().set({
                    margin: 0.5,
                    filename: 'PathGenAI_Roadmap.pdf',
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                }).from(roadmapContent).save();
            } catch (err) {
                errorMsg.textContent = 'Failed to generate PDF.';
                errorMsg.classList.remove('hidden');
                errorMsg.classList.remove('text-green-600', 'dark:text-green-400');
                errorMsg.classList.add('text-red-600', 'dark:text-red-400');
                console.error('PDF generation error:', err);
            } finally {
                // Restore dark mode if it was enabled
                if (hadDark) html.classList.add('dark');
            }
        });
    }

    // --- Email Roadmap ---
    const emailRoadmapBtn = document.getElementById('emailRoadmapBtn');
    if (emailRoadmapBtn && roadmapContent && errorMsg) {
        emailRoadmapBtn.addEventListener('click', async () => {
            if (!roadmapContent || roadmapContent.innerHTML.trim() === '' || roadmapContent.parentElement.classList.contains('hidden')) {
                errorMsg.textContent = 'No roadmap to email. Please generate one first.';
                errorMsg.classList.remove('hidden');
                errorMsg.classList.remove('text-green-600', 'dark:text-green-400');
                errorMsg.classList.add('text-red-600', 'dark:text-red-400');
                return;
            }
            const email = prompt('Enter your email address to receive the roadmap:');
            if (!email) return;
            try {
                emailRoadmapBtn.disabled = true;
                emailRoadmapBtn.textContent = 'Sending...';
                errorMsg.classList.add('hidden');
                errorMsg.textContent = '';
                const response = await fetch('/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        roadmap: roadmapContent.innerHTML
                    })
                });
                const data = await response.json();
                if (data.success) {
                    errorMsg.textContent = 'Roadmap sent successfully!';
                    errorMsg.classList.remove('hidden');
                    errorMsg.classList.remove('text-red-600', 'dark:text-red-400');
                    errorMsg.classList.add('text-green-600', 'dark:text-green-400');
                } else {
                    throw new Error(data.error || 'Failed to send email.');
                }
            } catch (err) {
                errorMsg.textContent = `Error: ${err.message}`;
                errorMsg.classList.remove('hidden');
                errorMsg.classList.remove('text-green-600', 'dark:text-green-400');
                errorMsg.classList.add('text-red-600', 'dark:text-red-400');
            } finally {
                emailRoadmapBtn.disabled = false;
                emailRoadmapBtn.textContent = 'Email Roadmap';
            }
        });
    }
});