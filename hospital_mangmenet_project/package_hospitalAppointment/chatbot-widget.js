(function () {
  const toggle = document.createElement('button');
  toggle.id = 'hcw-toggle';
  toggle.setAttribute('aria-label', 'Open chat assistant');
  toggle.className = 'fixed bottom-6 right-6 z-[99999] w-[60px] h-[60px] rounded-full border-0 bg-[#0d9668] text-white text-[28px] cursor-pointer shadow-[0_4px_20px_rgba(13,150,104,0.45)] flex items-center justify-center transition-transform transition-shadow duration-200 hover:scale-[1.08] hover:shadow-[0_6px_28px_rgba(13,150,104,0.55)]';
  toggle.innerHTML = '&#9993;';

  const panel = document.createElement('div');
  panel.id = 'hcw-panel';
  panel.className = 'fixed bottom-24 right-6 z-[99998] w-[390px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-130px)] bg-[#f8faf9] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden translate-y-5 scale-[0.95] opacity-0 pointer-events-none transition-[transform,opacity] duration-300 ease-[cubic-bezier(.4,0,.2,1)] font-[Segoe_UI,system-ui,-apple-system,sans-serif]';

  panel.innerHTML = `
<div id="hcw-header" class="bg-gradient-to-br from-[#0d9668] to-[#065f46] text-white px-5 py-[18px] shrink-0">
<h3 class="m-0 mb-[2px] text-base font-bold tracking-[0.3px]"><span class="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>Appointment Assistant</h3>
<p class="m-0 text-xs opacity-85">Hospital Appointment Management System</p>
</div>
<div id="hcw-messages" class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth"></div>
<div id="hcw-suggestions" class="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0"></div>
<div id="hcw-input-area" class="p-3 px-4 border-t border-[#e2e8e4] flex gap-2 shrink-0 bg-white">
<input type="text" id="hcw-input" placeholder="Type your question..." autocomplete="off" class="flex-1 border border-[#d1d9d4] rounded-[10px] py-2.5 px-3.5 text-[13.5px] outline-none bg-[#f8faf9] transition-colors duration-200 focus:border-[#0d9668]" />
<button id="hcw-send" aria-label="Send message" class="w-[42px] h-[42px] rounded-[10px] border-0 bg-[#0d9668] text-white text-lg cursor-pointer flex items-center justify-center transition-[background,transform] duration-200 hover:bg-[#065f46] active:scale-[0.93] disabled:bg-[#a7c4b8] disabled:cursor-not-allowed">&#10148;</button>
</div>
`;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const msgContainer = document.getElementById('hcw-messages');
  const input = document.getElementById('hcw-input');
  const sendBtn = document.getElementById('hcw-send');
  const sugContainer = document.getElementById('hcw-suggestions');

  let isOpen = false;
  let isProcessing = false;

  const suggestions = [
    'Book an appointment',
    'Cancel appointment',
    'Check doctor availability',
    'Appointment status',
    'Departments',
    'Insurance info',
    'Visiting hours',
    'Upload reports',
    'Teleconsultation',
    'Give feedback',
  ];

  /*
   * ============================================================
   * PREDEFINED RESPONSES / LOCAL INTENT HANDLER
   * ============================================================
   */

  const localResponses = {
    greeting: {
      keywords: [
        'hello',
        'hi',
        'hey',
        'good morning',
        'good afternoon',
        'good evening',
        'namaste',
      ],
      response:
        'Hello! 👋 I\'m your Hospital Appointment Management assistant. How can I help you today? You can ask me about appointments, doctors, departments, reports, insurance, visiting hours, or teleconsultation.',
    },

    thanks: {
      keywords: [
        'thank you',
        'thanks',
        'thankyou',
        'thx',
        'thanks a lot',
        'appreciate it',
      ],
      response:
        'You\'re very welcome! 😊 If you need anything else regarding your appointment or hospital services, just ask.',
    },

    bookAppointment: {
      keywords: [
        'book appointment',
        'book an appointment',
        'schedule appointment',
        'schedule an appointment',
        'make appointment',
        'make an appointment',
        'new appointment',
        'want appointment',
        'need appointment',
        'appointment with doctor',
        'see a doctor',
        'visit a doctor',
        'doctor appointment',
        'consult a doctor',
        'consultation appointment',
      ],
      response:
        '**Booking an appointment**\n\nYou can book an appointment by selecting:\n\n• Department\n• Doctor\n• Preferred date\n• Available time slot\n• Patient details\n\nIf your hospital portal supports online booking, you can continue through the appointment booking section. If you tell me the **department or doctor name**, I can help guide you through the process.',
    },

    cancelAppointment: {
      keywords: [
        'cancel appointment',
        'cancel my appointment',
        'cancel an appointment',
        'appointment cancel',
        'want to cancel',
        'need to cancel',
        'remove appointment',
        'delete appointment',
        'cannot attend appointment',
        'cant attend appointment',
        'can not attend appointment',
      ],
      response:
        '**Cancel an appointment**\n\nTo cancel an appointment, open your appointment details and select **Cancel Appointment**. You may need to provide the appointment ID or patient details.\n\nIf you don\'t see a cancellation option, please contact the hospital reception or appointment desk.',
    },

    rescheduleAppointment: {
      keywords: [
        'reschedule appointment',
        'reschedule my appointment',
        'change appointment',
        'change my appointment',
        'change appointment date',
        'change appointment time',
        'move appointment',
        'postpone appointment',
        'appointment reschedule',
        'want to reschedule',
        'need to reschedule',
      ],
      response:
        '**Reschedule an appointment**\n\nYou can usually reschedule by opening your existing appointment and selecting a new **date and time slot**.\n\nIf you tell me whether you want to change the **date** or **time**, I can explain the next steps.',
    },

    doctorAvailability: {
      keywords: [
        'doctor availability',
        'doctor available',
        'is doctor available',
        'doctor free',
        'doctor schedule',
        'doctor timings',
        'doctor timing',
        'available doctors',
        'which doctor is available',
        'when is doctor available',
        'when doctor available',
        'specialist available',
        'specialist availability',
      ],
      response:
        '**Doctor availability**\n\nDoctor availability depends on the department, doctor, and date.\n\nPlease provide a **doctor name or department** and your preferred date, and I can help you understand what information you need to check an available slot.',
    },

    appointmentStatus: {
      keywords: [
        'appointment status',
        'check appointment',
        'check my appointment',
        'appointment confirmed',
        'is my appointment confirmed',
        'appointment confirmation',
        'appointment details',
        'my appointment',
        'upcoming appointment',
        'appointment booked',
        'booking status',
        'booking confirmation',
      ],
      response:
        '**Appointment status**\n\nTo check your appointment status, you normally need your **appointment ID**, registered mobile number, or patient ID.\n\nYour appointment may show a status such as:\n\n• Confirmed\n• Pending\n• Cancelled\n• Completed\n• Rescheduled',
    },

    departments: {
      keywords: [
        'departments',
        'department',
        'hospital departments',
        'which departments',
        'what departments',
        'specialties',
        'specialists',
        'medical departments',
        'available departments',
        'list of departments',
      ],
      response:
        '**Hospital departments**\n\nCommon hospital departments include:\n\n• Cardiology\n• Neurology\n• Orthopedics\n• General Medicine\n• Pediatrics\n• Dermatology\n• Gynecology\n• ENT\n• Ophthalmology\n• General Surgery\n\nThe exact departments available depend on the hospital.',
    },

    insurance: {
      keywords: [
        'insurance',
        'health insurance',
        'medical insurance',
        'insurance accepted',
        'insurance coverage',
        'insurance claim',
        'insurance policy',
        'cashless',
        'cashless treatment',
        'insurance provider',
        'insurance companies',
        'insurance information',
      ],
      response:
        '**Insurance information**\n\nInsurance coverage depends on your policy and the hospital\'s insurance network.\n\nFor insurance-related queries, you may need:\n\n• Insurance card/policy number\n• Patient ID\n• Government-issued ID\n• Pre-authorization documents, if required\n\nPlease contact the hospital billing or insurance desk to confirm whether your specific policy is accepted.',
    },

    visitingHours: {
      keywords: [
        'visiting hours',
        'visitor hours',
        'visiting time',
        'visitor timing',
        'patient visiting',
        'when can i visit',
        'when can we visit',
        'can i visit patient',
        'visit patient',
        'hospital visiting time',
        'hospital visiting hours',
      ],
      response:
        '**Visiting hours**\n\nVisiting hours can vary by department, ward, ICU, and hospital policy.\n\nFor the most accurate timing, please check the hospital\'s reception desk or the visiting-hours section of the hospital website.',
    },

    reports: {
      keywords: [
        'lab report',
        'lab reports',
        'test report',
        'test reports',
        'medical report',
        'medical reports',
        'blood report',
        'blood test',
        'upload report',
        'upload reports',
        'download report',
        'download reports',
        'report available',
        'report ready',
        'check report',
      ],
      response:
        '**Lab reports**\n\nYou can usually access your reports from the **Reports / Lab Results** section of the patient portal.\n\nDepending on your hospital system, you may be able to:\n\n• View reports online\n• Download PDF reports\n• Upload previous reports\n• Share reports with your doctor\n\nIf you tell me whether you want to **upload, view, or download** a report, I can guide you further.',
    },

    prescription: {
      keywords: [
        'prescription',
        'prescriptions',
        'medicine prescription',
        'doctor prescription',
        'download prescription',
        'prescription report',
        'my medicines',
        'medicines prescribed',
      ],
      response:
        '**Prescriptions**\n\nYour prescriptions may be available under the **Prescriptions / Medical Records** section of the patient portal.\n\nYou can usually view the prescribed medicines, dosage instructions, and prescription date.',
    },

    teleconsultation: {
      keywords: [
        'teleconsultation',
        'tele consultation',
        'online consultation',
        'online doctor',
        'online appointment',
        'video consultation',
        'video appointment',
        'consult online',
        'talk to doctor online',
        'doctor online',
        'remote consultation',
      ],
      response:
        '**Teleconsultation**\n\nA teleconsultation allows you to consult a doctor remotely using an online appointment.\n\nTypically, you need to:\n\n1. Select a doctor\n2. Choose an online/teleconsultation slot\n3. Complete the booking\n4. Join using the provided consultation link\n\nMake sure your phone or computer has a working camera, microphone, and internet connection.',
    },

    payment: {
      keywords: [
        'payment',
        'payments',
        'pay bill',
        'pay my bill',
        'hospital bill',
        'billing',
        'bill payment',
        'payment methods',
        'how can i pay',
        'online payment',
        'refund',
        'refund payment',
      ],
      response:
        '**Payments & billing**\n\nHospital payments may be available through online payment, card, cash, or other supported payment methods.\n\nFor questions about a specific bill, payment, or refund, keep your **patient ID or bill number** available when contacting the billing department.',
    },

    emergency: {
      keywords: [
        'emergency',
        'medical emergency',
        'urgent medical',
        'urgent care',
        'accident',
        'serious injury',
        'critical condition',
        'need emergency',
        'emergency department',
        'emergency room',
      ],
      response:
        '**Emergency care**\n\nIf this is a medical emergency, please contact your local emergency service or go to the nearest emergency department immediately.\n\nThis chatbot is intended for appointment and hospital information and should not be used for urgent medical diagnosis or treatment.',
    },

    feedback: {
      keywords: [
        'feedback',
        'give feedback',
        'submit feedback',
        'complaint',
        'complaints',
        'file complaint',
        'report problem',
        'report issue',
        'bad service',
        'service complaint',
        'hospital complaint',
      ],
      response:
        '**Feedback & complaints**\n\nYou can normally submit feedback through the hospital\'s **Feedback / Complaints** section or contact the hospital administration or patient-relations desk.\n\nWhen submitting feedback, include your appointment or patient details if relevant.',
    },

    contact: {
      keywords: [
        'contact hospital',
        'hospital contact',
        'contact number',
        'phone number',
        'hospital phone',
        'reception number',
        'reception desk',
        'appointment desk',
        'contact reception',
        'how can i contact',
        'who should i contact',
      ],
      response:
        '**Hospital contact**\n\nFor appointment-specific questions, you can contact the hospital\'s **appointment desk or reception**.\n\nFor billing questions, contact the **billing department**. For insurance questions, contact the **insurance desk**.',
    },

    location: {
      keywords: [
        'hospital location',
        'hospital address',
        'where is hospital',
        'where is the hospital',
        'hospital directions',
        'how to reach hospital',
        'hospital map',
        'hospital address',
      ],
      response:
        '**Hospital location**\n\nPlease check the hospital\'s official website or contact reception for the current address and directions.',
    },

    help: {
      keywords: [
        'help',
        'what can you do',
        'what do you do',
        'how can you help',
        'what can i ask',
        'available options',
        'commands',
      ],
      response:
        '**I can help with:**\n\n• Booking appointments\n• Cancelling or rescheduling appointments\n• Doctor availability\n• Appointment status\n• Hospital departments\n• Insurance information\n• Visiting hours\n• Lab reports\n• Prescriptions\n• Teleconsultation\n• Payments and billing\n• Feedback and complaints\n\nJust type your question in normal language.',
    },
  };

  /*
   * Normalize the user's sentence.
   * This makes long sentences and different capitalization easier
   * to match.
   */
  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /*
   * Check whether a keyword exists in the sentence.
   */
  function containsKeyword(text, keyword) {
    return text.includes(keyword);
  }

  /*
   * Return a predefined response when the message matches
   * a known intent.
   */
  function getLocalResponse(message) {
    const text = normalizeText(message);

    /*
     * Emergency gets highest priority.
     */
    if (
      localResponses.emergency.keywords.some((keyword) =>
        containsKeyword(text, keyword)
      )
    ) {
      return localResponses.emergency.response;
    }

    /*
     * Check more specific appointment intents before the
     * generic appointment intent.
     */
    if (
      localResponses.cancelAppointment.keywords.some((keyword) =>
        containsKeyword(text, keyword)
      )
    ) {
      return localResponses.cancelAppointment.response;
    }

    if (
      localResponses.rescheduleAppointment.keywords.some((keyword) =>
        containsKeyword(text, keyword)
      )
    ) {
      return localResponses.rescheduleAppointment.response;
    }

    if (
      localResponses.doctorAvailability.keywords.some((keyword) =>
        containsKeyword(text, keyword)
      )
    ) {
      return localResponses.doctorAvailability.response;
    }

    if (
      localResponses.appointmentStatus.keywords.some((keyword) =>
        containsKeyword(text, keyword)
      )
    ) {
      return localResponses.appointmentStatus.response;
    }

    if (
      localResponses.bookAppointment.keywords.some((keyword) =>
        containsKeyword(text, keyword)
      )
    ) {
      return localResponses.bookAppointment.response;
    }

    /*
     * Check all remaining intents.
     */
    const orderedIntents = [
      'greeting',
      'thanks',
      'departments',
      'insurance',
      'visitingHours',
      'reports',
      'prescription',
      'teleconsultation',
      'payment',
      'feedback',
      'contact',
      'location',
      'help',
    ];

    for (const intent of orderedIntents) {
      const matched = localResponses[intent].keywords.some((keyword) =>
        containsKeyword(text, keyword)
      );

      if (matched) {
        return localResponses[intent].response;
      }
    }

    /*
     * Nothing matched.
     * Returning null means the request should go to
     * /api/chatbot.
     */
    return null;
  }

  function renderSuggestions() {
    sugContainer.innerHTML = '';

    suggestions.forEach((s) => {
      const btn = document.createElement('button');

      btn.className = 'py-1.5 px-3.5 border border-[#0d9668] rounded-full bg-white text-[#0d9668] text-xs cursor-pointer transition-all duration-150 whitespace-nowrap hover:bg-[#0d9668] hover:text-white';

      btn.textContent = s;
      btn.addEventListener('click', () => sendMessage(s));

      sugContainer.appendChild(btn);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMessage(text) {
    let html = escapeHtml(text);

    html = html.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="text-[#065f46]">$1</strong>'
    );

    html = html.replace(/^(\d+)\.\s+/gm, '<br>$1. ');
    html = html.replace(/^•\s+/gm, '<br>• ');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/^<br>/, '');

    return html;
  }

  function addMessage(text, sender) {
    const div = document.createElement('div');

    div.className =
      sender === 'bot'
        ? 'max-w-[88%] self-start bg-white text-[#1a2e23] border border-[#e2e8e4] rounded-[14px] rounded-bl-[4px] py-3 px-4 text-[13.5px] leading-[1.55] break-words shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
        : 'max-w-[88%] self-end bg-[#0d9668] text-white rounded-[14px] rounded-br-[4px] py-3 px-4 text-[13.5px] leading-[1.55] break-words shadow-[0_2px_8px_rgba(13,150,104,0.3)]';

    div.innerHTML =
      sender === 'bot' ? formatMessage(text) : escapeHtml(text);

    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');

    div.id = 'hcw-typing-indicator';
    div.className =
      'self-start bg-white border border-[#e2e8e4] rounded-bl-[4px] py-3.5 px-5 flex gap-[5px]';

    div.innerHTML = `
<span class="w-[7px] h-[7px] bg-[#0d9668] rounded-full animate-bounce"></span>
<span class="w-[7px] h-[7px] bg-[#0d9668] rounded-full animate-bounce [animation-delay:0.15s]"></span>
<span class="w-[7px] h-[7px] bg-[#0d9668] rounded-full animate-bounce [animation-delay:0.3s]"></span>
`;

    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('hcw-typing-indicator');

    if (el) {
      el.remove();
    }
  }

  async function sendMessage(text) {
    if (isProcessing) return;

    const msg = (text || input.value).trim();

    if (!msg) return;

    input.value = '';
    sugContainer.innerHTML = '';

    addMessage(msg, 'user');

    isProcessing = true;
    sendBtn.disabled = true;

    /*
     * ============================================================
     * FIRST: TRY LOCAL PREDEFINED RESPONSE
     * ============================================================
     */

    const localResponse = getLocalResponse(msg);

    if (localResponse) {
      showTyping();

      /*
       * Small delay makes the local response feel natural instead
       * of appearing instantly.
       */
      setTimeout(() => {
        hideTyping();
        addMessage(localResponse, 'bot');

        isProcessing = false;
        sendBtn.disabled = false;
        input.focus();
      }, 400);

      return;
    }

    /*
     * ============================================================
     * SECOND: SEND UNKNOWN QUESTIONS TO YOUR API
     * ============================================================
     */

    showTyping();

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      hideTyping();

      if (data.error) {
        addMessage(data.error, 'bot');
      } else if (data.reply) {
        addMessage(data.reply, 'bot');
      } else {
        addMessage(
          'I\'m sorry, I couldn\'t find an answer to that. Please try asking about appointments, doctors, departments, reports, insurance, visiting hours, or teleconsultation.',
          'bot'
        );
      }
    } catch (err) {
      hideTyping();

      addMessage(
        "Sorry, I couldn't reach the server. Please check your connection and try again.",
        'bot'
      );
    }

    isProcessing = false;
    sendBtn.disabled = false;
    input.focus();
  }

  toggle.addEventListener('click', () => {
    isOpen = !isOpen;

    if (isOpen) {
      panel.classList.remove(
        'translate-y-5',
        'scale-[0.95]',
        'opacity-0',
        'pointer-events-none'
      );

      panel.classList.add(
        'translate-y-0',
        'scale-100',
        'opacity-100',
        'pointer-events-auto'
      );

      toggle.classList.remove(
        'bg-[#0d9668]',
        'shadow-[0_4px_20px_rgba(13,150,104,0.45)]'
      );

      toggle.classList.add(
        'rotate-90',
        'bg-[#dc2626]',
        'shadow-[0_4px_20px_rgba(220,38,38,0.4)]'
      );

      toggle.setAttribute('aria-label', 'Close chat assistant');
      toggle.innerHTML = '&#10005;';

      if (msgContainer.children.length === 0) {
        addMessage(
          "Hello! I'm your Hospital Appointment Management assistant. I can help you with:\n\n• Booking, cancelling, or rescheduling appointments\n• Finding doctors and checking availability\n• Lab reports and prescriptions\n• Insurance and payment queries\n• Department information and visiting hours\n\nType your question or tap a suggestion below to get started.",
          'bot'
        );

        renderSuggestions();
      }

      input.focus();
    } else {
      panel.classList.remove(
        'translate-y-0',
        'scale-100',
        'opacity-100',
        'pointer-events-auto'
      );

      panel.classList.add(
        'translate-y-5',
        'scale-[0.95]',
        'opacity-0',
        'pointer-events-none'
      );

      toggle.classList.remove(
        'rotate-90',
        'bg-[#dc2626]',
        'shadow-[0_4px_20px_rgba(220,38,38,0.4)]'
      );

      toggle.classList.add(
        'bg-[#0d9668]',
        'shadow-[0_4px_20px_rgba(13,150,104,0.45)]'
      );

      toggle.setAttribute('aria-label', 'Open chat assistant');
      toggle.innerHTML = '&#9993;';
    }
  });

  sendBtn.addEventListener('click', () => sendMessage());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();