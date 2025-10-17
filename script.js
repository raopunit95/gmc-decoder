// Policy Data (This is your database)
const policyData = {
    'platinum-plus': {
        name: 'Platinum Plus',
        roomRent: 'Single A/C Room',
        generalCopay: '0%',
        intimationCopay: '10% if not done within 3 days',
        preOp: '30 days',
        postOp: '60 days',
        refractivePower: '±7.5',
        treatments: {
            'robotic surgeries': { cap: '₹1 Crore', copay: '0%' },
            'cyberknife': { cap: '₹6 Lakhs', copay: '0%' },
            'joint replacement single': { cap: '₹2.5 Lakhs', copay: '0%' },
            'joint replacement double': { cap: '₹4 Lakhs', copay: '0%' },
            'cataract': { cap: '₹40,000', copay: '0%' },
            'maternity normal': { cap: '₹75,000', copay: '0%' },
            'maternity c-section': { cap: '₹1 Lakh', copay: '0%' },
            'infertility': { cap: '₹2 Lakhs', copay: '0%' },
            'hysterectomy': { cap: '₹1 Lakh', copay: '0%' }
        }
    },
    'platinum': {
        name: 'Platinum',
        roomRent: 'Single A/C Room',
        generalCopay: '12.5%',
        intimationCopay: '10% if not done within 3 days',
        preOp: '30 days',
        postOp: '60 days',
        refractivePower: '±7.5',
        treatments: {
            'robotic surgeries': { cap: '₹1 Crore', copay: '12.5%' },
            'cyberknife': { cap: '₹6 Lakhs', copay: '12.5%' },
            'joint replacement single': { cap: '₹2.5 Lakhs', copay: '12.5%' },
            'cataract': { cap: '₹40,000', copay: '12.5%' }
        }
    },
    'gold-plus': {
        name: 'Gold Plus',
        roomRent: 'Single A/C for Employee, Twin Sharing for Parents',
        generalCopay: '10%',
        intimationCopay: '10% if not done within 3 days',
        preOp: '30 days',
        postOp: '60 days',
        refractivePower: '±7.5',
        treatments: {
            'robotic surgeries': { cap: '₹1 Crore', copay: '10%' },
            'cataract': { cap: '₹40,000', copay: '10%' }
        }
    }
};

// Treatment suggestions list
const allTreatments = [
    'Robotic Surgeries', 'Cyberknife', 'Joint Replacement Single',
    'Joint Replacement Double', 'Cataract', 'Maternity Normal',
    'Maternity C-Section', 'Infertility', 'Hysterectomy'
];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupTreatmentSearch();
    setupDecodeButton();
});

// Setup treatment search with suggestions
function setupTreatmentSearch() {
    const searchInput = document.getElementById('treatmentSearch');
    const suggestionsDiv = document.getElementById('treatmentSuggestions');

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
            suggestionsDiv.classList.remove('active');
            return;
        }

        const matches = allTreatments.filter(treatment => 
            treatment.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            suggestionsDiv.innerHTML = matches.map(treatment => 
                `<div class="suggestion-item" onclick="selectTreatment('${treatment}')">${treatment}</div>`
            ).join('');
            suggestionsDiv.classList.add('active');
        } else {
            suggestionsDiv.classList.remove('active');
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.remove('active');
        }
    });
}

// Select treatment from suggestions
function selectTreatment(treatment) {
    document.getElementById('treatmentSearch').value = treatment;
    document.getElementById('treatmentSuggestions').classList.remove('active');
}

// Setup decode button validation
function setupDecodeButton() {
    const gradeSelect = document.getElementById('gradeSelect');
    const decodeBtn = document.getElementById('decodeBtn');

    gradeSelect.addEventListener('change', function() {
        if (this.value) {
            decodeBtn.disabled = false;
        } else {
            decodeBtn.disabled = true;
        }
    });

    // Disable button initially
    decodeBtn.disabled = true;
}

// Main decode function
function decodeBenefits() {
    const selectedGrade = document.getElementById('gradeSelect').value;
    const treatmentQuery = document.getElementById('treatmentSearch').value.toLowerCase().trim();

    if (!selectedGrade) {
        alert('Please select a policy grade first!');
        return;
    }

    const gradeData = policyData[selectedGrade];
    let resultsHTML = '';

    // Check for specific treatment
    let foundTreatment = null;
    if (treatmentQuery) {
        for (const [key, value] of Object.entries(gradeData.treatments)) {
            if (key.includes(treatmentQuery) || treatmentQuery.includes(key)) {
                foundTreatment = { name: formatTreatmentName(key), ...value };
                break;
            }
        }
    }

    // Show treatment-specific results if found
    if (foundTreatment) {
        resultsHTML += `
            <div class="card treatment-highlight">
                <h3>✅ ${foundTreatment.name} Coverage</h3>
                <div class="coverage-detail">
                    <span>Maximum Coverage:</span>
                    <span class="coverage-value">${foundTreatment.cap}</span>
                </div>
                <div class="coverage-detail">
                    <span>Your Copay:</span>
                    <span class="coverage-value">${foundTreatment.copay}</span>
                </div>
                <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
                    <small><strong>Pre-Op:</strong> ${gradeData.preOp} | <strong>Post-Op:</strong> ${gradeData.postOp}</small>
                </div>
            </div>
        `;
    }

    // General policy summary
    resultsHTML += `
        <div class="card">
            <h2>🛡️ Your ${gradeData.name} Benefits Summary</h2>
            
            <div class="benefit-item">
                <h4>Room Rent Eligibility</h4>
                <p class="benefit-value">${gradeData.roomRent}</p>
            </div>

            <div class="benefit-item">
                <h4>General Copay</h4>
                <p class="benefit-value">${gradeData.generalCopay}</p>
            </div>

            <div class="benefit-item">
                <h4>Intimation Copay</h4>
                <p class="benefit-value">${gradeData.intimationCopay}</p>
            </div>

            <div class="benefit-item">
                <h4>Pre & Post Hospitalization</h4>
                <p class="benefit-value">Pre-Op: ${gradeData.preOp} | Post-Op: ${gradeData.postOp}</p>
            </div>

            <div class="benefit-item">
                <h4>Refractive Eye Surgery Coverage</h4>
                <p class="benefit-value">Power: ${gradeData.refractivePower}</p>
            </div>
        </div>

        <div class="card alert-box">
            <h4>⚠️ Important Information</h4>
            <ul>
                <li>Coverage details shown are high-level benefits from your GMC policy</li>
                <li>For detailed policy limits, exclusions, and claims process, contact your TPA (Mediassist)</li>
                <li>MediBuddy can help you schedule surgeries at 1,200+ partnered hospitals</li>
                <li>Intimate your TPA within required timeframe to avoid additional copay</li>
            </ul>
        </div>
    `;

    // Display results
    document.getElementById('resultsContent').innerHTML = resultsHTML;
    showScreen('resultsScreen');
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go back to home screen
function goBack() {
    showScreen('homeScreen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Switch between screens
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Format treatment name for display
function formatTreatmentName(name) {
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}