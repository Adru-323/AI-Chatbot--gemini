   // DOM Element References
        const chatHistory = document.getElementById('chat-history');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const loadingSpinner = document.getElementById('loading-spinner');
 //time display
const now = new Date();
const hours = now.getHours();
const minutes = now.getMinutes();
const ampm = hours >= 12 ? 'PM' : 'AM';
const formattedHours = hours % 12 || 12;
const formattedTime = `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
// Inject into the HTML element with id="timeDisplay"
document.getElementById("timeDisplay").textContent = formattedTime;
//
        // Application State
        let chatMessages = []; // Stores the chat history as objects { role: 'user'/'bot', text: 'message' }
        let isLoading = false; // Tracks if an API call is in progress
        let debounceTimer; // Timer for debouncing

        // API Configuration (Placeholders for demonstration)
        const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
        // The API key is left empty as per instructions; Canvas will provide it at runtime.
        const API_KEY =  "AIzaSyCL6PxAIMZ6qc-B3vZ2NvAM55Slo1qonMs"; // Keep this empty; Canvas will inject the key

        const DEBOUNCE_DELAY = 500; // milliseconds

        // --- Helper Functions ---

        /**
         * Formats the current time for display in messages.
         * @returns {string} Formatted time (e.g., "7:17 PM")
         */
        function getCurrentFormattedTime() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedHours = hours % 12 || 12;
            return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
        }

        /**
         * Appends a message to the chat history display.
         * @param {string} role - 'user' or 'bot'
         * @param {string} text - The message text
         */
        function displayMessage(role, text) {
            const messageWrapper = document.createElement('div');
            messageWrapper.className = `message-wrapper ${role}-message-wrapper`; // Use custom classes for alignment

            const messageBubble = document.createElement('div');
            messageBubble.className = `message-bubble ${role}-message`; // Use custom classes for background/text

            messageBubble.textContent = text;
            
            // Add timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'message-timestamp';
            timestamp.textContent = `${role === 'user' ? 'You' : 'AI'} - ${getCurrentFormattedTime()}`;
            messageBubble.appendChild(timestamp);

            messageWrapper.appendChild(messageBubble);
            chatHistory.appendChild(messageWrapper);

            // Scroll to the bottom of the chat history with smooth animation
            chatHistory.scrollTo({
                top: chatHistory.scrollHeight,
                behavior: 'smooth'
            });
        }

        /**
         * Toggles the visibility of the loading spinner and disables/enables input/button.
         * @param {boolean} show - True to show spinner and disable elements, false to hide and enable.
         */
        function toggleLoadingState(show) {
            isLoading = show;
            if (show) {
                loadingSpinner.classList.remove('hidden');
                sendButton.disabled = true;
                userInput.disabled = true;
                userInput.placeholder = 'Thinking...';
            } else {
                loadingSpinner.classList.add('hidden');
                sendButton.disabled = false;
                userInput.disabled = false;
                userInput.placeholder = 'Type your message...';
                userInput.focus(); // Focus on input after response
            }
        }

        /**
         * Sends the user's message to the AI and handles the response.
         */
        async function sendMessage() {
            const userText = userInput.value.trim();
            if (userText === '') return; // Don't send empty messages

            displayMessage('user', userText);
            chatMessages.push({ role: 'user', parts: [{ text: userText }] });// formate accepted by gemini api
            userInput.value = ''; // Clear input field

            toggleLoadingState(true); // Show loading spinner and disable input

            try {
                // Construct the payload for the Gemini API call
                const payload = {  //creatyes the json object
                    contents: chatMessages.map(msg => ({ // this array holds the conversation history.
                        role: msg.role === 'user' ? 'user' : 'model', // Gemini API uses 'model' for bot
                        parts: msg.parts
                    }))
                };

                // Make the API call
                const response = await fetch(`${API_BASE_URL}?key=${API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    // If response is not OK (e.g., 400, 500), throw an error
                    const errorData = await response.json();
                    throw new Error(`API error: ${response.status} - ${errorData.error.message || response.statusText}`);
                }

                const result = await response.json();

                // Process the AI's response
                let botResponseText = 'Sorry, I could not generate a response.';
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    botResponseText = result.candidates[0].content.parts[0].text;
                } else {
                    // Handle cases where the response structure is unexpected
                    console.error("Unexpected API response structure:", result);
                    botResponseText = "An unexpected error occurred with the AI response.";
                }

                displayMessage('bot', botResponseText);
                chatMessages.push({ role: 'bot', parts: [{ text: botResponseText }] });

            } catch (error) {
                console.error('Error calling AI API:', error);
                // Display user-friendly error message in chat history
                displayMessage('bot', `Error: ${error.message}. Please try again.`);
            } finally {
                toggleLoadingState(false); // Hide loading spinner and re-enable input
            }
        }

        /**
         * Debounce function to limit how often a function can be called.
         * @param {function} func - The function to debounce.
         * @param {number} delay - The delay in milliseconds.
         * @returns {function} The debounced function.
         */
        function debounce(func, delay) {
            return function(...args) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    func.apply(this, args);
                }, delay);
            };
        }

        // --- Event Listeners ---

        // Debounce the sendMessage function for the button click
        sendButton.addEventListener('click', debounce(sendMessage, DEBOUNCE_DELAY));

        // Debounce the sendMessage function for the Enter key press in the input field
        userInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !isLoading) {
                debounce(sendMessage, DEBOUNCE_DELAY)(); // Call debounced function
            }
        });

        // Initialize UI after script loads
        document.addEventListener('DOMContentLoaded', () => {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        });

        