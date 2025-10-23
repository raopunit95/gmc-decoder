// Global policy data variable (will be loaded from JSON)
let policyData = {};

// Global variables
let selectedCorporate = 'Tata Consultancy Services';
let selectedGrade = '';
let currentTreatment = '';

// Load policy data from JSON file
async function loadPolicyData() {
    try {
        const response = await fetch('policy_data_structured.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        policyData = await response.json();
        console.log('Policy data loaded successfully!');
        
        // Initialize the app after data is loaded
        initializeApp();
        
    } catch (error) {
        console.error('Error loading policy data:', error);
        
        // Show user-friendly error message
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="card alert-box">
                    <h4>⚠️ Error Loading Data</h4>
                    <p>Unable to load policy information. Please make sure the <code>policy_data_structured.json</code> file is in the same directory as this page.</p>
                    <p><strong>Error details:</strong> ${error.message}</p>
                    <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }
}

// Initialize app after data loads
function initializeApp() {
    loadGrades();
}

// Initialize on page load - Load JSON data first
document.addEventListener('DOMContentLoaded', function() {
    loadPolicyData();
});

// Toggle Corporate Edit Mode
function toggleCorporateEdit() {
    const display = document.getElementById('corporateDisplay');
    const edit = document.getElementById('corporateEdit');
    const input = document.getElementById('corporateInput');
    
    display.style.display = 'none';
    edit.style.display = 'block';
    input.value = selectedCorporate;
    input.focus();
}

// Filter Corporates
function filterCorporates() {
    const input = document.getElementById('corporateInput').value.toLowerCase();
    const dropdown = document.getElementById('corporateDropdown');
    
    if (input.length === 0) {
        dropdown.classList.remove('active');
        return;
    }
    
    const matches = Object.keys(policyData).filter(name => 
        name.toLowerCase().includes(input)
    );
    
    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(name => 
            `<div class="dropdown-item" onclick="selectCorporate('${name}')">${name}</div>`
        ).join('');
        dropdown.classList.add('active');
    } else {
        dropdown.innerHTML = '<div class="dropdown-item" style="color: #999;">No matching companies found</div>';
        dropdown.classList.add('active');
    }
}

// Select Corporate
function selectCorporate(name) {
    selectedCorporate = name;
    document.getElementById('selectedCorporateName').textContent = name;
    document.getElementById('corporateInput').value = name;
    document.getElementById('corporateDropdown').classList.remove('active');
}

// Confirm Corporate Selection
function confirmCorporate() {
    const input = document.getElementById('corporateInput').value;
    
    if (policyData[input]) {
        selectedCorporate = input;
        document.getElementById('selectedCorporateName').textContent = input;
    }
    
    cancelCorporateEdit();
    loadGrades();
}

// Cancel Corporate Edit
function cancelCorporateEdit() {
    document.getElementById('corporateDisplay').style.display = 'block';
    document.getElementById('corporateEdit').style.display = 'none';
    document.getElementById('corporateDropdown').classList.remove('active');
}

// Load Grades based on selected corporate
function loadGrades() {
    const corporate = policyData[selectedCorporate];
    const gradeSection = document.getElementById('gradeSection');
    const decodeBtn = document.getElementById('decodeBtn');
    
    if (!corporate) return;
    
    // If single grade or no grades, auto-select
    if (!corporate.hasGrades || corporate.grades.length === 1) {
        selectedGrade = corporate.grades[0].id;
        gradeSection.innerHTML = `
            <div class="grade-auto">
                <span class="icon">✅</span>
                <div class="grade-auto-text">
                    <h3>${corporate.grades[0].name} (Auto-selected)</h3>
                    <p>Your company has a single policy tier</p>
                </div>
            </div>
        `;
        decodeBtn.disabled = false;
        showTreatmentCard();
    } else {
        // Multiple grades - show dropdown
        gradeSection.innerHTML = `
            <select id="gradeSelect" class="input-field" onchange="handleGradeChange()">
                <option value="">-- Select Grade --</option>
                ${corporate.grades.map(grade => 
                    `<option value="${grade.id}">${grade.name}</option>`
                ).join('')}
            </select>
        `;
        selectedGrade = '';
        decodeBtn.disabled = true;
        document.getElementById('treatmentCard').style.display = 'none';
    }
}

// Handle Grade Change
function handleGradeChange() {
    const select = document.getElementById('gradeSelect');
    selectedGrade = select.value;
    
    if (selectedGrade) {
        document.getElementById('decodeBtn').disabled = false;
        showTreatmentCard();
    } else {
        document.getElementById('decodeBtn').disabled = true;
        document.getElementById('treatmentCard').style.display = 'none';
    }
}

// Show Treatment Card
function showTreatmentCard() {
    document.getElementById('treatmentCard').style.display = 'block';
}

// Get all available treatments for selected grade
function getAvailableTreatments() {
    const corporate = policyData[selectedCorporate];
    const grade = corporate.grades.find(g => g.id === selectedGrade);
    
    if (!grade) return [];
    
    return Object.keys(grade.treatments);
}

// Filter Treatments
function filterTreatments() {
    const input = document.getElementById('treatmentSearch').value.toLowerCase();
    const dropdown = document.getElementById('treatmentDropdown');
    
    if (input.length === 0) {
        dropdown.classList.remove('active');
        return;
    }
    
    const treatments = getAvailableTreatments();
    const matches = treatments.filter(name => 
        name.toLowerCase().includes(input)
    );
    
    let html = '';
    
    if (matches.length > 0) {
        html = matches.map(name => 
            `<div class="dropdown-item" onclick="selectTreatment('${name}')">${name}</div>`
        ).join('');
    }
    
    // Always add "Item not in list" option
    html += `<div class="dropdown-item not-in-list" onclick="selectTreatment('not-in-list')">❌ Item not in list</div>`;
    
    dropdown.innerHTML = html;
    dropdown.classList.add('active');
}

// Show Treatment Dropdown
function showTreatmentDropdown() {
    const input = document.getElementById('treatmentSearch').value;
    if (input.length > 0) {
        filterTreatments();
    } else {
        const treatments = getAvailableTreatments();
        const dropdown = document.getElementById('treatmentDropdown');
        
        let html = treatments.map(name => 
            `<div class="dropdown-item" onclick="selectTreatment('${name}')">${name}</div>`
        ).join('');
        
        html += `<div class="dropdown-item not-in-list" onclick="selectTreatment('not-in-list')">❌ Item not in list</div>`;
        
        dropdown.innerHTML = html;
        dropdown.classList.add('active');
    }
}

// Select Treatment
function selectTreatment(name) {
    if (name === 'not-in-list') {
        currentTreatment = 'not-in-list';
        document.getElementById('treatmentSearch').value = 'Treatment not in list';
    } else {
        currentTreatment = name;
        document.getElementById('treatmentSearch').value = name;
    }
    document.getElementById('treatmentDropdown').classList.remove('active');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('#corporateEdit')) {
        document.getElementById('corporateDropdown').classList.remove('active');
    }
    if (!e.target.closest('#treatmentCard')) {
        document.getElementById('treatmentDropdown').classList.remove('active');
    }
});

// Decode Benefits - Main Function
function decodeBenefits() {
    if (!selectedCorporate || !selectedGrade) {
        alert('Please select a company and grade first!');
        return;
    }
    
    const corporate = policyData[selectedCorporate];
    const grade = corporate.grades.find(g => g.id === selectedGrade);
    
    if (!grade) return;
    
    let resultsHTML = '';
    
    // Treatment-specific result
    if (currentTreatment && currentTreatment !== 'not-in-list') {
        const treatment = grade.treatments[currentTreatment];
        if (treatment) {
            resultsHTML += `
                <div class="card treatment-highlight">
                    <h3>✅ ${currentTreatment} Coverage</h3>
                    <div class="coverage-row">
                        <span>Maximum Coverage:</span>
                        <span class="coverage-value">${treatment.cap}</span>
                    </div>
                    <div class="coverage-row">
                        <span>Your Copay:</span>
                        <span class="coverage-value">${treatment.copay}</span>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
                        <small><strong>Pre-Op:</strong> ${grade.preOp} | <strong>Post-Op:</strong> ${grade.postOp}</small>
                    </div>
                </div>
            `;
        }
    } else if (currentTreatment === 'not-in-list') {
        resultsHTML += `
            <div class="card alert-box">
                <h4>⚠️ Treatment Not Found in Coverage List</h4>
                <p>The treatment you searched for is not specifically listed in your policy benefits. This could mean:</p>
                <ul>
                    <li>It may be covered under "Other Diseases" or general medical coverage</li>
                    <li>It may require special approval from your TPA</li>
                    <li>It may fall under exclusions</li>
                </ul>
                <p><strong>Recommendation:</strong> Contact your TPA (Mediassist) at 1800-XXX-XXXX for specific treatment coverage confirmation.</p>
            </div>
        `;
    }
    
    // General Benefits Summary
    resultsHTML += `
        <div class="card">
            <h2>🛡️ Your ${grade.name} Benefits Summary</h2>
            <p style="color: #666; margin-bottom: 20px;"><strong>Company:</strong> ${selectedCorporate}</p>
            
            <div class="benefit-item">
                <h4>Room Rent Eligibility</h4>
                <p class="benefit-value">${grade.roomRent}</p>
            </div>

            <div class="benefit-item">
                <h4>General Copay</h4>
                <p class="benefit-value">${grade.generalCopay}</p>
            </div>

            <div class="benefit-item">
                <h4>Intimation Copay</h4>
                <p class="benefit-value">${grade.intimationCopay}</p>
            </div>

            <div class="benefit-item">
                <h4>Pre & Post Hospitalization</h4>
                <p class="benefit-value">Pre-Op: ${grade.preOp} | Post-Op: ${grade.postOp}</p>
            </div>

            <div class="benefit-item">
                <h4>Refractive Eye Surgery Coverage</h4>
                <p class="benefit-value">Power: ${grade.refractivePower}</p>
            </div>
        </div>
    `;
    
    // Exclusions
    if (grade.exclusions) {
        resultsHTML += `
            <div class="card">
                <h3 style="color: #dc3545;">❌ Exclusions</h3>
                <p class="benefit-value" style="font-size: 1rem; line-height: 1.6;">${grade.exclusions}</p>
            </div>
        `;
    }
    
    // Inclusions
    if (grade.inclusions) {
        resultsHTML += `
            <div class="card">
                <h3 style="color: #28a745;">✅ Inclusions</h3>
                <p class="benefit-value" style="font-size: 1rem; line-height: 1.6;">${grade.inclusions}</p>
            </div>
        `;
    }
    
    // Remarks
    if (grade.remarks) {
        resultsHTML += `
            <div class="card" style="background: #e7f3ff; border-left: 4px solid #0066cc;">
                <h3 style="color: #0066cc;">📋 Important Remarks</h3>
                <p class="benefit-value" style="font-size: 1rem; line-height: 1.6;">${grade.remarks}</p>
            </div>
        `;
    }
    
    // Important Information
    resultsHTML += `
        <div class="card alert-box">
            <h4>ℹ️ Important Information</h4>
            <ul>
                <li>Coverage details shown are high-level benefits from your GMC policy</li>
                <li>For detailed policy limits, claim procedures, and pre-authorization, contact your TPA (Mediassist)</li>
                <li>Always intimate your TPA within the required timeframe to avoid additional copay</li>
                <li>Keep all original bills, prescriptions, and discharge summaries for claim processing</li>
            </ul>
        </div>
    `;
    
    // Display results
    document.getElementById('resultsContent').innerHTML = resultsHTML;
    showScreen('resultsScreen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go back to home screen
function goBack() {
    showScreen('homeScreen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Reset treatment search
    currentTreatment = '';
    document.getElementById('treatmentSearch').value = '';
}

// Switch between screens
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}




// Complete GMC Policy Data with Inclusions, Exclusions, Remarks
// const policyData = {
//     'Tata Consultancy Services': {
//         hasGrades: true,
//         grades: [
//             {
//                 id: 'platinum-plus',
//                 name: 'Platinum Plus',
//                 roomRent: 'Single A/C Room',
//                 generalCopay: '0%',
//                 intimationCopay: '10% if not done within 3 days',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±7.5',
//                 exclusions: 'Alcohol Drug Illness, Breech of Law, Convalescence, Cosmetic, Egg Freezing, Hazardous Sports, Rest Cure, Ritual Circumcision, Self Injury, STD, Sterility, Surrogacy Delivery, War, Congenital External, Congenital External Life Threatening, Alcohol Drug Abuse, Hearing Aid, Obstructive Sleep Apnoea',
//                 inclusions: 'Normal ailments, Vitiligo, Infertility, Conventional chemotherapy, Surgery, Cancer care, AIDS, Psychiatric treatment',
//                 remarks: 'Bariatric surgery covered if BMI ≥ 40, or BMI ≥ 35 with co-morbidities. 10% copay if intimation is not done within 3 days.',
//                 treatments: {
//                     'Robotic surgeries': { cap: '₹1 Crore', copay: '0%' },
//                     'Cyberknife': { cap: '₹6 Lakhs', copay: '0%' },
//                     'Joint Replacement-single': { cap: '₹2.5 Lakhs', copay: '0%' },
//                     'Joint Replacement-double': { cap: '₹4 Lakhs', copay: '0%' },
//                     'Cataract': { cap: '₹40,000', copay: '0%' },
//                     'Maternity Normal': { cap: '₹75,000', copay: '0%' },
//                     'Maternity C-Section': { cap: '₹1 Lakh', copay: '0%' },
//                     'Infertility': { cap: '₹2 Lakhs', copay: '0%' },
//                     'Hysterectomy': { cap: '₹1 Lakh', copay: '0%' },
//                     'Balloon Sinuplasty': { cap: '₹4 Lakhs', copay: '0%' }
//                 }
//             },
//             {
//                 id: 'platinum',
//                 name: 'Platinum',
//                 roomRent: 'Single A/C Room',
//                 generalCopay: '12.5%',
//                 intimationCopay: '10% if not done within 3 days',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±7.5',
//                 exclusions: 'Alcohol Drug Illness, Breech of Law, Convalescence, Cosmetic, Egg Freezing, Hazardous Sports, Rest Cure, Ritual Circumcision, Self Injury, STD, Sterility, Surrogacy Delivery, War',
//                 inclusions: 'Normal ailments, Vitiligo, Infertility, Cancer care, Psychiatric treatment',
//                 remarks: 'Bariatric surgery covered if BMI ≥ 40, or BMI ≥ 35 with co-morbidities. 10% copay if intimation is not done within 3 days.',
//                 treatments: {
//                     'Robotic surgeries': { cap: '₹1 Crore', copay: '12.5%' },
//                     'Cyberknife': { cap: '₹6 Lakhs', copay: '12.5%' },
//                     'Joint Replacement-single': { cap: '₹2.5 Lakhs', copay: '12.5%' },
//                     'Cataract': { cap: '₹40,000', copay: '12.5%' }
//                 }
//             },
//             {
//                 id: 'gold-plus',
//                 name: 'Gold Plus',
//                 roomRent: 'Single A/C for Employee, Twin Sharing for Parents',
//                 generalCopay: '10%',
//                 intimationCopay: '10% if not done within 3 days',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±7.5',
//                 exclusions: 'Alcohol Drug Illness, Cosmetic, Egg Freezing, Hazardous Sports, Surrogacy Delivery',
//                 inclusions: 'Normal ailments, Vitiligo, Infertility, Cancer care',
//                 remarks: 'Bariatric surgery covered if BMI ≥ 40. 10% copay if intimation is not done within 3 days.',
//                 treatments: {
//                     'Robotic surgeries': { cap: '₹1 Crore', copay: '10%' },
//                     'Cataract': { cap: '₹40,000', copay: '10%' }
//                 }
//             }
//         ]
//     },
//     'Cognizant Technology Solutions': {
//         hasGrades: true,
//         grades: [
//             {
//                 id: 'level-1',
//                 name: 'Level 1',
//                 roomRent: '₹4,000/day (Normal), ICU: As per actuals',
//                 generalCopay: '10%',
//                 intimationCopay: '15% if not done',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±5',
//                 exclusions: 'Alcohol/Drug abuse, Cosmetic procedures, Surrogacy Delivery, War, Self-injury, Hazardous Sports',
//                 inclusions: 'Pre-existing conditions, Congenital internal and external (as listed), Genetic disorders, Critical illness, Bariatric surgery (BMI ≥ 35)',
//                 remarks: '100% approval for VIP employees. No copay for workplace accidents. Ambulance: 1% of SI or ₹2,000.',
//                 treatments: {
//                     'Cataract': { cap: '₹35,000', copay: '10%' },
//                     'Maternity': { cap: '₹75,000', copay: '10%' },
//                     'Joint Replacement-single': { cap: '₹2 Lakhs', copay: '10%' },
//                     'Joint Replacement-double': { cap: '₹3 Lakhs', copay: '10%' },
//                     'Hysterectomy': { cap: '₹75,000', copay: '10%' }
//                 }
//             },
//             {
//                 id: 'level-2',
//                 name: 'Level 2',
//                 roomRent: '₹4,000/day (Normal), ICU: As per actuals',
//                 generalCopay: '10%',
//                 intimationCopay: '15% if not done',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±5',
//                 exclusions: 'Alcohol/Drug abuse, Cosmetic procedures, Surrogacy Delivery',
//                 inclusions: 'Pre-existing conditions, Congenital conditions, Critical illness',
//                 remarks: '100% approval for VIP employees. Ambulance coverage included.',
//                 treatments: {
//                     'Cataract': { cap: '₹35,000', copay: '10%' },
//                     'Maternity': { cap: '₹75,000', copay: '10%' }
//                 }
//             }
//         ]
//     },
//     'Reliance Retail Limited': {
//         hasGrades: true,
//         grades: [
//             {
//                 id: 'supervisory',
//                 name: 'Supervisory',
//                 roomRent: 'Twin Sharing A/C Room',
//                 generalCopay: '0%',
//                 intimationCopay: '0%',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±7.0',
//                 exclusions: 'Breech Of Law, Cosmetic, Alcohol Drug Abuse, Hazardous Sports, Rest Cure, Ritual Circumcision, Self Injury, War, STD, Dental, Health Check, HIV AIDS, Surrogacy Delivery',
//                 inclusions: 'Pre-existing conditions, Congenital internal and external, Genetic disorders, Critical illness, Bariatric surgery (BMI ≥ 35)',
//                 remarks: 'Bariatric surgery covered if BMI ≥ 40, or BMI ≥ 35 with co-morbidities.',
//                 treatments: {
//                     'Cataract': { cap: '₹60,000', copay: '0%' },
//                     'Maternity': { cap: '₹50,000', copay: '0%' },
//                     'Robotic Surgeries': { cap: '50% of bill', copay: '0%' }
//                 }
//             },
//             {
//                 id: 'executive',
//                 name: 'Executive',
//                 roomRent: 'Single A/C Room',
//                 generalCopay: '0%',
//                 intimationCopay: '0%',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±7.0',
//                 exclusions: 'Breech Of Law, Cosmetic, Alcohol Drug Abuse, Hazardous Sports',
//                 inclusions: 'Pre-existing conditions, Congenital conditions, Critical illness, Bariatric surgery',
//                 remarks: 'Bariatric surgery covered if BMI ≥ 40, or BMI ≥ 35 with co-morbidities.',
//                 treatments: {
//                     'Cataract': { cap: '₹60,000', copay: '0%' },
//                     'Maternity': { cap: '₹50,000', copay: '0%' }
//                 }
//             }
//         ]
//     },
//     'Infosys Limited': {
//         hasGrades: false,
//         grades: [
//             {
//                 id: 'default',
//                 name: 'Default',
//                 roomRent: 'Single A/C Room',
//                 generalCopay: '10%',
//                 intimationCopay: '15% if not done within 48 hours',
//                 preOp: '30 days',
//                 postOp: '60 days',
//                 refractivePower: '±6',
//                 exclusions: 'Cosmetic procedures, Surrogacy, Hazardous Sports, Self-injury',
//                 inclusions: 'Pre-existing conditions, Maternity, Critical illness, Cancer care',
//                 remarks: 'Standard corporate policy. Cashless facility available at network hospitals.',
//                 treatments: {
//                     'Cataract': { cap: '₹45,000', copay: '10%' },
//                     'Joint Replacement-single': { cap: '₹2 Lakhs', copay: '10%' },
//                     'Maternity': { cap: '₹80,000', copay: '10%' }
//                 }
//             }
//         ]
//     }
// };

// // Global variables
// let selectedCorporate = 'Tata Consultancy Services';
// let selectedGrade = '';
// let currentTreatment = '';

// // Initialize on page load
// document.addEventListener('DOMContentLoaded', function() {
//     loadGrades();
// });

// // Toggle Corporate Edit Mode
// function toggleCorporateEdit() {
//     const display = document.getElementById('corporateDisplay');
//     const edit = document.getElementById('corporateEdit');
//     const input = document.getElementById('corporateInput');
    
//     display.style.display = 'none';
//     edit.style.display = 'block';
//     input.value = selectedCorporate;
//     input.focus();
// }

// // Filter Corporates
// function filterCorporates() {
//     const input = document.getElementById('corporateInput').value.toLowerCase();
//     const dropdown = document.getElementById('corporateDropdown');
    
//     if (input.length === 0) {
//         dropdown.classList.remove('active');
//         return;
//     }
    
//     const matches = Object.keys(policyData).filter(name => 
//         name.toLowerCase().includes(input)
//     );
    
//     if (matches.length > 0) {
//         dropdown.innerHTML = matches.map(name => 
//             `<div class="dropdown-item" onclick="selectCorporate('${name}')">${name}</div>`
//         ).join('');
//         dropdown.classList.add('active');
//     } else {
//         dropdown.innerHTML = '<div class="dropdown-item" style="color: #999;">No matching companies found</div>';
//         dropdown.classList.add('active');
//     }
// }

// // Select Corporate
// function selectCorporate(name) {
//     selectedCorporate = name;
//     document.getElementById('selectedCorporateName').textContent = name;
//     document.getElementById('corporateInput').value = name;
//     document.getElementById('corporateDropdown').classList.remove('active');
// }

// // Confirm Corporate Selection
// function confirmCorporate() {
//     const input = document.getElementById('corporateInput').value;
    
//     if (policyData[input]) {
//         selectedCorporate = input;
//         document.getElementById('selectedCorporateName').textContent = input;
//     }
    
//     cancelCorporateEdit();
//     loadGrades();
// }

// // Cancel Corporate Edit
// function cancelCorporateEdit() {
//     document.getElementById('corporateDisplay').style.display = 'block';
//     document.getElementById('corporateEdit').style.display = 'none';
//     document.getElementById('corporateDropdown').classList.remove('active');
// }

// // Load Grades based on selected corporate
// function loadGrades() {
//     const corporate = policyData[selectedCorporate];
//     const gradeSection = document.getElementById('gradeSection');
//     const decodeBtn = document.getElementById('decodeBtn');
    
//     if (!corporate) return;
    
//     // If single grade or no grades, auto-select
//     if (!corporate.hasGrades || corporate.grades.length === 1) {
//         selectedGrade = corporate.grades[0].id;
//         gradeSection.innerHTML = `
//             <div class="grade-auto">
//                 <span class="icon">✅</span>
//                 <div class="grade-auto-text">
//                     <h3>${corporate.grades[0].name} (Auto-selected)</h3>
//                     <p>Your company has a single policy tier</p>
//                 </div>
//             </div>
//         `;
//         decodeBtn.disabled = false;
//         showTreatmentCard();
//     } else {
//         // Multiple grades - show dropdown
//         gradeSection.innerHTML = `
//             <select id="gradeSelect" class="input-field" onchange="handleGradeChange()">
//                 <option value="">-- Select Grade --</option>
//                 ${corporate.grades.map(grade => 
//                     `<option value="${grade.id}">${grade.name}</option>`
//                 ).join('')}
//             </select>
//         `;
//         selectedGrade = '';
//         decodeBtn.disabled = true;
//         document.getElementById('treatmentCard').style.display = 'none';
//     }
// }

// // Handle Grade Change
// function handleGradeChange() {
//     const select = document.getElementById('gradeSelect');
//     selectedGrade = select.value;
    
//     if (selectedGrade) {
//         document.getElementById('decodeBtn').disabled = false;
//         showTreatmentCard();
//     } else {
//         document.getElementById('decodeBtn').disabled = true;
//         document.getElementById('treatmentCard').style.display = 'none';
//     }
// }

// // Show Treatment Card
// function showTreatmentCard() {
//     document.getElementById('treatmentCard').style.display = 'block';
// }

// // Get all available treatments for selected grade
// function getAvailableTreatments() {
//     const corporate = policyData[selectedCorporate];
//     const grade = corporate.grades.find(g => g.id === selectedGrade);
    
//     if (!grade) return [];
    
//     return Object.keys(grade.treatments);
// }

// // Filter Treatments
// function filterTreatments() {
//     const input = document.getElementById('treatmentSearch').value.toLowerCase();
//     const dropdown = document.getElementById('treatmentDropdown');
    
//     if (input.length === 0) {
//         dropdown.classList.remove('active');
//         return;
//     }
    
//     const treatments = getAvailableTreatments();
//     const matches = treatments.filter(name => 
//         name.toLowerCase().includes(input)
//     );
    
//     let html = '';
    
//     if (matches.length > 0) {
//         html = matches.map(name => 
//             `<div class="dropdown-item" onclick="selectTreatment('${name}')">${name}</div>`
//         ).join('');
//     }
    
//     // Always add "Item not in list" option
//     html += `<div class="dropdown-item not-in-list" onclick="selectTreatment('not-in-list')">❌ Item not in list</div>`;
    
//     dropdown.innerHTML = html;
//     dropdown.classList.add('active');
// }

// // Show Treatment Dropdown
// function showTreatmentDropdown() {
//     const input = document.getElementById('treatmentSearch').value;
//     if (input.length > 0) {
//         filterTreatments();
//     } else {
//         const treatments = getAvailableTreatments();
//         const dropdown = document.getElementById('treatmentDropdown');
        
//         let html = treatments.map(name => 
//             `<div class="dropdown-item" onclick="selectTreatment('${name}')">${name}</div>`
//         ).join('');
        
//         html += `<div class="dropdown-item not-in-list" onclick="selectTreatment('not-in-list')">❌ Item not in list</div>`;
        
//         dropdown.innerHTML = html;
//         dropdown.classList.add('active');
//     }
// }

// // Select Treatment
// function selectTreatment(name) {
//     if (name === 'not-in-list') {
//         currentTreatment = 'not-in-list';
//         document.getElementById('treatmentSearch').value = 'Treatment not in list';
//     } else {
//         currentTreatment = name;
//         document.getElementById('treatmentSearch').value = name;
//     }
//     document.getElementById('treatmentDropdown').classList.remove('active');
// }

// // Close dropdowns when clicking outside
// document.addEventListener('click', function(e) {
//     if (!e.target.closest('#corporateEdit')) {
//         document.getElementById('corporateDropdown').classList.remove('active');
//     }
//     if (!e.target.closest('#treatmentCard')) {
//         document.getElementById('treatmentDropdown').classList.remove('active');
//     }
// });

// // Decode Benefits - Main Function
// function decodeBenefits() {
//     if (!selectedCorporate || !selectedGrade) {
//         alert('Please select a company and grade first!');
//         return;
//     }
    
//     const corporate = policyData[selectedCorporate];
//     const grade = corporate.grades.find(g => g.id === selectedGrade);
    
//     if (!grade) return;
    
//     let resultsHTML = '';
    
//     // Treatment-specific result
//     if (currentTreatment && currentTreatment !== 'not-in-list') {
//         const treatment = grade.treatments[currentTreatment];
//         if (treatment) {
//             resultsHTML += `
//                 <div class="card treatment-highlight">
//                     <h3>✅ ${currentTreatment} Coverage</h3>
//                     <div class="coverage-row">
//                         <span>Maximum Coverage:</span>
//                         <span class="coverage-value">${treatment.cap}</span>
//                     </div>
//                     <div class="coverage-row">
//                         <span>Your Copay:</span>
//                         <span class="coverage-value">${treatment.copay}</span>
//                     </div>
//                     <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
//                         <small><strong>Pre-Op:</strong> ${grade.preOp} | <strong>Post-Op:</strong> ${grade.postOp}</small>
//                     </div>
//                 </div>
//             `;
//         }
//     } else if (currentTreatment === 'not-in-list') {
//         resultsHTML += `
//             <div class="card alert-box">
//                 <h4>⚠️ Treatment Not Found in Coverage List</h4>
//                 <p>The treatment you searched for is not specifically listed in your policy benefits. This could mean:</p>
//                 <ul>
//                     <li>It may be covered under "Other Diseases" or general medical coverage</li>
//                     <li>It may require special approval from your TPA</li>
//                     <li>It may fall under exclusions</li>
//                 </ul>
//                 <p><strong>Recommendation:</strong> Contact your TPA (Mediassist) at 1800-XXX-XXXX for specific treatment coverage confirmation.</p>
//             </div>
//         `;
//     }
    
//     // General Benefits Summary
//     resultsHTML += `
//         <div class="card">
//             <h2>🛡️ Your ${grade.name} Benefits Summary</h2>
//             <p style="color: #666; margin-bottom: 20px;"><strong>Company:</strong> ${selectedCorporate}</p>
            
//             <div class="benefit-item">
//                 <h4>Room Rent Eligibility</h4>
//                 <p class="benefit-value">${grade.roomRent}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>General Copay</h4>
//                 <p class="benefit-value">${grade.generalCopay}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>Intimation Copay</h4>
//                 <p class="benefit-value">${grade.intimationCopay}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>Pre & Post Hospitalization</h4>
//                 <p class="benefit-value">Pre-Op: ${grade.preOp} | Post-Op: ${grade.postOp}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>Refractive Eye Surgery Coverage</h4>
//                 <p class="benefit-value">Power: ${grade.refractivePower}</p>
//             </div>
//         </div>
//     `;
    
//     // Exclusions
//     if (grade.exclusions) {
//         resultsHTML += `
//             <div class="card">
//                 <h3 style="color: #dc3545;">❌ Exclusions</h3>
//                 <p class="benefit-value" style="font-size: 1rem; line-height: 1.6;">${grade.exclusions}</p>
//             </div>
//         `;
//     }
    
//     // Inclusions
//     if (grade.inclusions) {
//         resultsHTML += `
//             <div class="card">
//                 <h3 style="color: #28a745;">✅ Inclusions</h3>
//                 <p class="benefit-value" style="font-size: 1rem; line-height: 1.6;">${grade.inclusions}</p>
//             </div>
//         `;
//     }
    
//     // Remarks
//     if (grade.remarks) {
//         resultsHTML += `
//             <div class="card" style="background: #e7f3ff; border-left: 4px solid #0066cc;">
//                 <h3 style="color: #0066cc;">📋 Important Remarks</h3>
//                 <p class="benefit-value" style="font-size: 1rem; line-height: 1.6;">${grade.remarks}</p>
//             </div>
//         `;
//     }
    
//     // Important Information
//     resultsHTML += `
//         <div class="card alert-box">
//             <h4>ℹ️ Important Information</h4>
//             <ul>
//                 <li>Coverage details shown are high-level benefits from your GMC policy</li>
//                 <li>For detailed policy limits, claim procedures, and pre-authorization, contact your TPA (Mediassist)</li>
//                 <li>Always intimate your TPA within the required timeframe to avoid additional copay</li>
//                 <li>Keep all original bills, prescriptions, and discharge summaries for claim processing</li>
//             </ul>
//         </div>
//     `;
    
//     // Display results
//     document.getElementById('resultsContent').innerHTML = resultsHTML;
//     showScreen('resultsScreen');
//     window.scrollTo({ top: 0, behavior: 'smooth' });
// }

// // Go back to home screen
// function goBack() {
//     showScreen('homeScreen');
//     window.scrollTo({ top: 0, behavior: 'smooth' });
    
//     // Reset treatment search
//     currentTreatment = '';
//     document.getElementById('treatmentSearch').value = '';
// }

// // Switch between screens
// function showScreen(screenId) {
//     const screens = document.querySelectorAll('.screen');
//     screens.forEach(screen => screen.classList.remove('active'));
//     document.getElementById(screenId).classList.add('active');
// }




// // Policy Data (This is your database)
// const policyData = {
//     'platinum-plus': {
//         name: 'Platinum Plus',
//         roomRent: 'Single A/C Room',
//         generalCopay: '0%',
//         intimationCopay: '10% if not done within 3 days',
//         preOp: '30 days',
//         postOp: '60 days',
//         refractivePower: '±7.5',
//         treatments: {
//             'robotic surgeries': { cap: '₹1 Crore', copay: '0%' },
//             'cyberknife': { cap: '₹6 Lakhs', copay: '0%' },
//             'joint replacement single': { cap: '₹2.5 Lakhs', copay: '0%' },
//             'joint replacement double': { cap: '₹4 Lakhs', copay: '0%' },
//             'cataract': { cap: '₹40,000', copay: '0%' },
//             'maternity normal': { cap: '₹75,000', copay: '0%' },
//             'maternity c-section': { cap: '₹1 Lakh', copay: '0%' },
//             'infertility': { cap: '₹2 Lakhs', copay: '0%' },
//             'hysterectomy': { cap: '₹1 Lakh', copay: '0%' }
//         }
//     },
//     'platinum': {
//         name: 'Platinum',
//         roomRent: 'Single A/C Room',
//         generalCopay: '12.5%',
//         intimationCopay: '10% if not done within 3 days',
//         preOp: '30 days',
//         postOp: '60 days',
//         refractivePower: '±7.5',
//         treatments: {
//             'robotic surgeries': { cap: '₹1 Crore', copay: '12.5%' },
//             'cyberknife': { cap: '₹6 Lakhs', copay: '12.5%' },
//             'joint replacement single': { cap: '₹2.5 Lakhs', copay: '12.5%' },
//             'cataract': { cap: '₹40,000', copay: '12.5%' }
//         }
//     },
//     'gold-plus': {
//         name: 'Gold Plus',
//         roomRent: 'Single A/C for Employee, Twin Sharing for Parents',
//         generalCopay: '10%',
//         intimationCopay: '10% if not done within 3 days',
//         preOp: '30 days',
//         postOp: '60 days',
//         refractivePower: '±7.5',
//         treatments: {
//             'robotic surgeries': { cap: '₹1 Crore', copay: '10%' },
//             'cataract': { cap: '₹40,000', copay: '10%' }
//         }
//     }
// };

// // Treatment suggestions list
// const allTreatments = [
//     'Robotic Surgeries', 'Cyberknife', 'Joint Replacement Single',
//     'Joint Replacement Double', 'Cataract', 'Maternity Normal',
//     'Maternity C-Section', 'Infertility', 'Hysterectomy'
// ];

// // Initialize when page loads
// document.addEventListener('DOMContentLoaded', function() {
//     setupTreatmentSearch();
//     setupDecodeButton();
// });

// // Setup treatment search with suggestions
// function setupTreatmentSearch() {
//     const searchInput = document.getElementById('treatmentSearch');
//     const suggestionsDiv = document.getElementById('treatmentSuggestions');

//     searchInput.addEventListener('input', function() {
//         const query = this.value.toLowerCase().trim();
        
//         if (query.length < 2) {
//             suggestionsDiv.classList.remove('active');
//             return;
//         }

//         const matches = allTreatments.filter(treatment => 
//             treatment.toLowerCase().includes(query)
//         );

//         if (matches.length > 0) {
//             suggestionsDiv.innerHTML = matches.map(treatment => 
//                 `<div class="suggestion-item" onclick="selectTreatment('${treatment}')">${treatment}</div>`
//             ).join('');
//             suggestionsDiv.classList.add('active');
//         } else {
//             suggestionsDiv.classList.remove('active');
//         }
//     });

//     // Close suggestions when clicking outside
//     document.addEventListener('click', function(e) {
//         if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
//             suggestionsDiv.classList.remove('active');
//         }
//     });
// }

// // Select treatment from suggestions
// function selectTreatment(treatment) {
//     document.getElementById('treatmentSearch').value = treatment;
//     document.getElementById('treatmentSuggestions').classList.remove('active');
// }

// // Setup decode button validation
// function setupDecodeButton() {
//     const gradeSelect = document.getElementById('gradeSelect');
//     const decodeBtn = document.getElementById('decodeBtn');

//     gradeSelect.addEventListener('change', function() {
//         if (this.value) {
//             decodeBtn.disabled = false;
//         } else {
//             decodeBtn.disabled = true;
//         }
//     });

//     // Disable button initially
//     decodeBtn.disabled = true;
// }

// // Main decode function
// function decodeBenefits() {
//     const selectedGrade = document.getElementById('gradeSelect').value;
//     const treatmentQuery = document.getElementById('treatmentSearch').value.toLowerCase().trim();

//     if (!selectedGrade) {
//         alert('Please select a policy grade first!');
//         return;
//     }

//     const gradeData = policyData[selectedGrade];
//     let resultsHTML = '';

//     // Check for specific treatment
//     let foundTreatment = null;
//     if (treatmentQuery) {
//         for (const [key, value] of Object.entries(gradeData.treatments)) {
//             if (key.includes(treatmentQuery) || treatmentQuery.includes(key)) {
//                 foundTreatment = { name: formatTreatmentName(key), ...value };
//                 break;
//             }
//         }
//     }

//     // Show treatment-specific results if found
//     if (foundTreatment) {
//         resultsHTML += `
//             <div class="card treatment-highlight">
//                 <h3>✅ ${foundTreatment.name} Coverage</h3>
//                 <div class="coverage-detail">
//                     <span>Maximum Coverage:</span>
//                     <span class="coverage-value">${foundTreatment.cap}</span>
//                 </div>
//                 <div class="coverage-detail">
//                     <span>Your Copay:</span>
//                     <span class="coverage-value">${foundTreatment.copay}</span>
//                 </div>
//                 <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
//                     <small><strong>Pre-Op:</strong> ${gradeData.preOp} | <strong>Post-Op:</strong> ${gradeData.postOp}</small>
//                 </div>
//             </div>
//         `;
//     }

//     // General policy summary
//     resultsHTML += `
//         <div class="card">
//             <h2>🛡️ Your ${gradeData.name} Benefits Summary</h2>
            
//             <div class="benefit-item">
//                 <h4>Room Rent Eligibility</h4>
//                 <p class="benefit-value">${gradeData.roomRent}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>General Copay</h4>
//                 <p class="benefit-value">${gradeData.generalCopay}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>Intimation Copay</h4>
//                 <p class="benefit-value">${gradeData.intimationCopay}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>Pre & Post Hospitalization</h4>
//                 <p class="benefit-value">Pre-Op: ${gradeData.preOp} | Post-Op: ${gradeData.postOp}</p>
//             </div>

//             <div class="benefit-item">
//                 <h4>Refractive Eye Surgery Coverage</h4>
//                 <p class="benefit-value">Power: ${gradeData.refractivePower}</p>
//             </div>
//         </div>

//         <div class="card alert-box">
//             <h4>⚠️ Important Information</h4>
//             <ul>
//                 <li>Coverage details shown are high-level benefits from your GMC policy</li>
//                 <li>For detailed policy limits, exclusions, and claims process, contact your TPA (Mediassist)</li>
//                 <li>MediBuddy can help you schedule surgeries at 1,200+ partnered hospitals</li>
//                 <li>Intimate your TPA within required timeframe to avoid additional copay</li>
//             </ul>
//         </div>
//     `;

//     // Display results
//     document.getElementById('resultsContent').innerHTML = resultsHTML;
//     showScreen('resultsScreen');
    
//     // Scroll to top smoothly
//     window.scrollTo({ top: 0, behavior: 'smooth' });
// }

// // Go back to home screen
// function goBack() {
//     showScreen('homeScreen');
//     window.scrollTo({ top: 0, behavior: 'smooth' });
// }

// // Switch between screens
// function showScreen(screenId) {
//     const screens = document.querySelectorAll('.screen');
//     screens.forEach(screen => screen.classList.remove('active'));
//     document.getElementById(screenId).classList.add('active');
// }

// // Format treatment name for display
// function formatTreatmentName(name) {
//     return name.split(' ')
//         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//         .join(' ');
// }




// import React, { useState, useEffect } from 'react';
// import { Search, AlertCircle, CheckCircle, Info, Shield, Edit2, Building2, ArrowLeft } from 'lucide-react';

// // Complete GMC Data with all corporates
// const GMC_DATA = {
//   "Tata Consultancy Services": {
//     hasGrades: true,
//     grades: [
//       {
//         id: "platinum-plus",
//         name: "Platinum Plus",
//         roomRent: "Single A/C Room",
//         generalCopay: "0%",
//         intimationCopay: "10% if not done within 3 days",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±7.5",
//         treatments: {
//           "Robotic surgeries": { cap: "₹1 Crore", copay: "0%" },
//           "Cyberknife": { cap: "₹6 Lakhs", copay: "0%" },
//           "Joint Replacement-single": { cap: "₹2.5 Lakhs", copay: "0%" },
//           "Joint Replacement-double": { cap: "₹4 Lakhs", copay: "0%" },
//           "Cataract": { cap: "₹40,000", copay: "0%" },
//           "Maternity-Normal": { cap: "₹75,000", copay: "0%" },
//           "Maternity-C Section": { cap: "₹1 Lakh", copay: "0%" },
//           "Infertility": { cap: "₹2 Lakhs", copay: "0%" },
//           "Hysterectomy": { cap: "₹1 Lakh", copay: "0%" }
//         }
//       },
//       {
//         id: "platinum",
//         name: "Platinum",
//         roomRent: "Single A/C Room",
//         generalCopay: "12.5%",
//         intimationCopay: "10% if not done within 3 days",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±7.5",
//         treatments: {
//           "Robotic surgeries": { cap: "₹1 Crore", copay: "12.5%" },
//           "Cyberknife": { cap: "₹6 Lakhs", copay: "12.5%" },
//           "Joint Replacement-single": { cap: "₹2.5 Lakhs", copay: "12.5%" },
//           "Cataract": { cap: "₹40,000", copay: "12.5%" }
//         }
//       },
//       {
//         id: "gold-plus",
//         name: "Gold Plus",
//         roomRent: "Single A/C for Employee, Twin Sharing for Parents",
//         generalCopay: "10%",
//         intimationCopay: "10% if not done within 3 days",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±7.5",
//         treatments: {
//           "Robotic surgeries": { cap: "₹1 Crore", copay: "10%" },
//           "Cataract": { cap: "₹40,000", copay: "10%" }
//         }
//       }
//     ]
//   },
//   "Cognizant Technology Solutions": {
//     hasGrades: true,
//     grades: [
//       {
//         id: "level-1",
//         name: "Level 1",
//         roomRent: "₹4,000/day (Normal), ICU: As per actuals",
//         generalCopay: "10%",
//         intimationCopay: "15% if not done",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±5",
//         treatments: {
//           "Cataract": { cap: "₹35,000", copay: "10%" },
//           "Maternity": { cap: "₹75,000", copay: "10%" },
//           "Joint Replacement-single": { cap: "₹2 Lakhs", copay: "10%" },
//           "Joint Replacement-double": { cap: "₹3 Lakhs", copay: "10%" },
//           "Hysterectomy": { cap: "₹75,000", copay: "10%" }
//         }
//       },
//       {
//         id: "level-2",
//         name: "Level 2",
//         roomRent: "₹4,000/day (Normal), ICU: As per actuals",
//         generalCopay: "10%",
//         intimationCopay: "15% if not done",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±5",
//         treatments: {
//           "Cataract": { cap: "₹35,000", copay: "10%" },
//           "Maternity": { cap: "₹75,000", copay: "10%" }
//         }
//       }
//     ]
//   },
//   "Reliance Retail Limited": {
//     hasGrades: true,
//     grades: [
//       {
//         id: "supervisory",
//         name: "Supervisory",
//         roomRent: "Twin Sharing A/C Room",
//         generalCopay: "0%",
//         intimationCopay: "0%",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±7.0",
//         treatments: {
//           "Cataract": { cap: "₹60,000", copay: "0%" },
//           "Maternity": { cap: "₹50,000", copay: "0%" },
//           "Robotic Surgeries": { cap: "50% of bill", copay: "0%" }
//         }
//       },
//       {
//         id: "executive",
//         name: "Executive",
//         roomRent: "Single A/C Room",
//         generalCopay: "0%",
//         intimationCopay: "0%",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±7.0",
//         treatments: {
//           "Cataract": { cap: "₹60,000", copay: "0%" },
//           "Maternity": { cap: "₹50,000", copay: "0%" }
//         }
//       }
//     ]
//   },
//   "Infosys Limited": {
//     hasGrades: false,
//     grades: [
//       {
//         id: "standard",
//         name: "Standard Policy",
//         roomRent: "Single A/C Room",
//         generalCopay: "10%",
//         intimationCopay: "15% if not done within 48 hours",
//         preOp: "30 days",
//         postOp: "60 days",
//         refractivePower: "±6",
//         treatments: {
//           "Cataract": { cap: "₹45,000", copay: "10%" },
//           "Joint Replacement-single": { cap: "₹2 Lakhs", copay: "10%" },
//           "Maternity": { cap: "₹80,000", copay: "10%" }
//         }
//       }
//     ]
//   }
// };

// const GMCDecoder = () => {
//   const [corporateName, setCorporateName] = useState("Tata Consultancy Services");
//   const [isEditingCorporate, setIsEditingCorporate] = useState(false);
//   const [corporateSuggestions, setCorporateSuggestions] = useState([]);
//   const [selectedGrade, setSelectedGrade] = useState("");
//   const [availableGrades, setAvailableGrades] = useState([]);
//   const [treatmentQuery, setTreatmentQuery] = useState("");
//   const [showResult, setShowResult] = useState(false);
//   const [autoSelected, setAutoSelected] = useState(false);

//   const corporateNames = Object.keys(GMC_DATA);

//   // Load grades when corporate changes
//   useEffect(() => {
//     if (corporateName && GMC_DATA[corporateName]) {
//       const corporate = GMC_DATA[corporateName];
//       setAvailableGrades(corporate.grades);
      
//       // Auto-select if only one grade or no grades distinction
//       if (!corporate.hasGrades || corporate.grades.length === 1) {
//         setSelectedGrade(corporate.grades[0].id);
//         setAutoSelected(true);
//       } else {
//         setSelectedGrade("");
//         setAutoSelected(false);
//       }
//     }
//   }, [corporateName]);

//   const handleCorporateChange = (e) => {
//     const value = e.target.value;
//     setCorporateName(value);
    
//     // Show suggestions
//     if (value.length > 0) {
//       const matches = corporateNames.filter(name => 
//         name.toLowerCase().includes(value.toLowerCase())
//       );
//       setCorporateSuggestions(matches);
//     } else {
//       setCorporateSuggestions([]);
//     }
    
//     setShowResult(false);
//   };

//   const selectCorporate = (name) => {
//     setCorporateName(name);
//     setCorporateSuggestions([]);
//     setIsEditingCorporate(false);
//   };

//   const handleDecode = () => {
//     if (!corporateName || !selectedGrade) {
//       return;
//     }
//     setShowResult(true);
//   };

//   const findTreatment = (query) => {
//     if (!query || !selectedGrade) return null;
    
//     const gradeData = availableGrades.find(g => g.id === selectedGrade);
//     if (!gradeData) return null;

//     const normalizedQuery = query.toLowerCase().trim();
    
//     for (const [key, value] of Object.entries(gradeData.treatments)) {
//       if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
//         return { name: key, ...value };
//       }
//     }
    
//     return null;
//   };

//   const selectedGradeData = availableGrades.find(g => g.id === selectedGrade);
//   const matchedTreatment = treatmentQuery ? findTreatment(treatmentQuery) : null;
//   const currentCorporate = GMC_DATA[corporateName];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <div className="flex items-center justify-center gap-2 mb-4">
//             <Shield className="w-10 h-10 text-blue-600" />
//             <h1 className="text-3xl md:text-4xl font-bold text-gray-800">GMC Policy Decoder</h1>
//           </div>
//           <p className="text-gray-600">Understand your corporate health insurance benefits instantly</p>
//         </div>

//         {!showResult ? (
//           /* Input Screen */
//           <div className="space-y-6">
//             {/* Corporate Name - Editable */}
//             <div className="bg-white rounded-xl shadow-lg p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="flex items-center gap-2">
//                   <Building2 className="w-5 h-5 text-blue-600" />
//                   <h2 className="text-lg font-semibold text-gray-800">Your Company</h2>
//                 </div>
//                 {!isEditingCorporate && (
//                   <button
//                     onClick={() => setIsEditingCorporate(true)}
//                     className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
//                   >
//                     <Edit2 className="w-4 h-4" />
//                     Edit
//                   </button>
//                 )}
//               </div>

//               {isEditingCorporate ? (
//                 <div className="relative">
//                   <input
//                     type="text"
//                     value={corporateName}
//                     onChange={handleCorporateChange}
//                     placeholder="Type your company name..."
//                     className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
//                     autoFocus
//                   />
//                   {corporateSuggestions.length > 0 && (
//                     <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
//                       {corporateSuggestions.map((name) => (
//                         <div
//                           key={name}
//                           onClick={() => selectCorporate(name)}
//                           className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
//                         >
//                           <p className="font-medium text-gray-800">{name}</p>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                   <div className="mt-3 flex gap-2">
//                     <button
//                       onClick={() => {
//                         setIsEditingCorporate(false);
//                         setCorporateSuggestions([]);
//                       }}
//                       className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
//                     >
//                       Confirm
//                     </button>
//                     <button
//                       onClick={() => {
//                         setCorporateName("Tata Consultancy Services");
//                         setIsEditingCorporate(false);
//                         setCorporateSuggestions([]);
//                       }}
//                       className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 border-l-4 border-blue-800">
//                   <p className="text-xl font-bold text-white">{corporateName}</p>
//                 </div>
//               )}
//             </div>

//             {/* Grade Selection */}
//             {currentCorporate && (
//               <div className="bg-white rounded-xl shadow-lg p-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-3">
//                   {currentCorporate.hasGrades ? "Select Your Policy Grade/Level" : "Policy Grade"}
//                 </label>
                
//                 {currentCorporate.hasGrades && availableGrades.length > 1 ? (
//                   <select
//                     value={selectedGrade}
//                     onChange={(e) => {
//                       setSelectedGrade(e.target.value);
//                       setAutoSelected(false);
//                     }}
//                     className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
//                   >
//                     <option value="">-- Select Grade --</option>
//                     {availableGrades.map((grade) => (
//                       <option key={grade.id} value={grade.id}>
//                         {grade.name}
//                       </option>
//                     ))}
//                   </select>
//                 ) : (
//                   <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
//                     <div className="flex items-center gap-2">
//                       <CheckCircle className="w-5 h-5 text-green-600" />
//                       <p className="font-semibold text-green-800">
//                         {availableGrades[0]?.name} (Auto-selected)
//                       </p>
//                     </div>
//                     <p className="text-sm text-green-700 mt-1">
//                       Your company has a single policy tier
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Treatment Search */}
//             {selectedGrade && (
//               <div className="bg-white rounded-xl shadow-lg p-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-3">
//                   Search Specific Treatment (Optional)
//                 </label>
//                 <div className="relative">
//                   <input
//                     type="text"
//                     value={treatmentQuery}
//                     onChange={(e) => setTreatmentQuery(e.target.value)}
//                     placeholder="e.g., Cataract, Joint Replacement, Maternity..."
//                     className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
//                   />
//                   <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
//                 </div>
//               </div>
//             )}

//             {/* Decode Button */}
//             {selectedGrade && (
//               <button
//                 onClick={handleDecode}
//                 disabled={!corporateName || !selectedGrade}
//                 className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg shadow-lg transition-all transform hover:scale-[1.02]"
//               >
//                 🔍 Decode My Policy Benefits
//               </button>
//             )}
//           </div>
//         ) : (
//           /* Results Screen */
//           <div className="space-y-6">
//             <button
//               onClick={() => setShowResult(false)}
//               className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
//             >
//               <ArrowLeft className="w-4 h-4" />
//               Back to Search
//             </button>

//             {/* Treatment Result */}
//             {matchedTreatment && (
//               <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-l-4 border-green-500">
//                 <div className="flex items-center gap-2 mb-4">
//                   <CheckCircle className="w-6 h-6 text-green-600" />
//                   <h3 className="text-xl font-bold text-gray-800">
//                     {matchedTreatment.name} Coverage
//                   </h3>
//                 </div>
//                 <div className="space-y-3 text-gray-700">
//                   <div className="flex justify-between items-center bg-white rounded-lg p-3">
//                     <span className="font-medium">Maximum Coverage:</span>
//                     <span className="text-xl font-bold text-green-600">{matchedTreatment.cap}</span>
//                   </div>
//                   <div className="flex justify-between items-center bg-white rounded-lg p-3">
//                     <span className="font-medium">Your Copay:</span>
//                     <span className="text-xl font-bold text-blue-600">{matchedTreatment.copay}</span>
//                   </div>
//                 </div>
//                 {selectedGradeData && (
//                   <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//                     <p className="text-sm text-gray-700">
//                       <strong>Pre-Op Coverage:</strong> {selectedGradeData.preOp} | 
//                       <strong> Post-Op Coverage:</strong> {selectedGradeData.postOp}
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* General Benefits */}
//             {selectedGradeData && (
//               <div className="bg-white rounded-xl shadow-lg p-6">
//                 <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
//                   <Shield className="w-6 h-6 text-blue-600" />
//                   Your {selectedGradeData.name} Benefits Summary
//                 </h3>
                
//                 <div className="space-y-4">
//                   <div className="border-l-4 border-blue-500 pl-4 py-2">
//                     <p className="text-sm text-gray-600 font-medium">Room Rent Eligibility</p>
//                     <p className="text-lg font-semibold text-gray-800">{selectedGradeData.roomRent}</p>
//                   </div>

//                   <div className="border-l-4 border-purple-500 pl-4 py-2">
//                     <p className="text-sm text-gray-600 font-medium">General Copay</p>
//                     <p className="text-lg font-semibold text-gray-800">{selectedGradeData.generalCopay}</p>
//                   </div>

//                   <div className="border-l-4 border-orange-500 pl-4 py-2">
//                     <p className="text-sm text-gray-600 font-medium">Intimation Copay</p>
//                     <p className="text-lg font-semibold text-gray-800">{selectedGradeData.intimationCopay}</p>
//                   </div>

//                   <div className="border-l-4 border-green-500 pl-4 py-2">
//                     <p className="text-sm text-gray-600 font-medium">Pre & Post Hospitalization</p>
//                     <p className="text-lg font-semibold text-gray-800">
//                       Pre-Op: {selectedGradeData.preOp} | Post-Op: {selectedGradeData.postOp}
//                     </p>
//                   </div>

//                   <div className="border-l-4 border-indigo-500 pl-4 py-2">
//                     <p className="text-sm text-gray-600 font-medium">Refractive Eye Surgery Coverage</p>
//                     <p className="text-lg font-semibold text-gray-800">Power: {selectedGradeData.refractivePower}</p>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Disclaimer */}
//             <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
//               <div className="flex items-start gap-3">
//                 <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
//                 <div>
//                   <h4 className="font-semibold text-gray-800 mb-2">Important Information</h4>
//                   <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
//                     <li>Coverage details shown are high-level benefits from your GMC policy</li>
//                     <li>For detailed policy limits, exclusions, and claims, contact your TPA (Mediassist)</li>
//                     <li>MediBuddy can help schedule surgeries at 1,200+ partnered hospitals</li>
//                   </ul>
//                 </div>
//               </div>
//             </div>

//             {/* CTA */}
//             <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
//               <h4 className="text-xl font-bold mb-2">Need Surgery Consultation?</h4>
//               <p className="mb-4 text-blue-100">Book at our partnered hospitals with no upfront payment</p>
//               <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
//                 Schedule Surgery Consultation
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default GMCDecoder;