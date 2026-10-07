import { getDb } from './database/firestore';

export async function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const checkUsers = await db.collection('users').get();
  if (!checkUsers.empty) {
    console.log('🌱 Database already populated. Skipping seed.');
    return;
  }

  console.log('🌱 Seeding initial sample data for College Event Management System...');

  const now = new Date().toISOString();

  // 1. Seed Users
  const users = [
    {
      uid: 'user_admin_01',
      name: 'Prof. Sharma (Admin)',
      email: 'admin@college.edu',
      role: 'admin',
      phone: '+91 98765 43210',
      department: 'Central Administration',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'user_coord_01',
      name: 'Sarah Jenkins (Dance Coordinator)',
      email: 'dance.coord@college.edu',
      role: 'coordinator',
      phone: '+91 98765 43211',
      department: 'Fine Arts',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'user_coord_02',
      name: 'Alan Turing (Quiz Coordinator)',
      email: 'quiz.coord@college.edu',
      role: 'coordinator',
      phone: '+91 98765 43212',
      department: 'Computer Science',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'user_jury_01',
      name: 'Maestro David (Dance Jury)',
      email: 'dance.judge@college.edu',
      role: 'jury',
      phone: '+91 98765 43213',
      department: 'Performing Arts',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'user_jury_02',
      name: 'Dr. Evelyn Fox (Quiz Jury)',
      email: 'quiz.judge@college.edu',
      role: 'jury',
      phone: '+91 98765 43214',
      department: 'Mathematics',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const user of users) {
    await db.collection('users').doc(user.uid).set(user);
  }

  // 2. Seed Events
  const events = [
    {
      id: 'event_arts_2027',
      name: 'College Arts Fest 2027',
      code: 'ARTS27',
      slug: 'arts-fest-2027',
      description: 'The annual inter-department cultural and arts extravaganza celebrating music, dance, theatre, and creative expression.',
      venue: 'Main Auditorium & Open Amphitheater',
      startDate: '2027-03-15T09:00:00Z',
      endDate: '2027-03-18T18:00:00Z',
      registrationStart: '2026-01-01T00:00:00Z',
      registrationEnd: '2027-12-31T23:59:59Z',
      status: 'REGISTRATION_OPEN',
      logoUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=300&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=1200&q=80',
      contactInfo: 'artscommittee@college.edu | +91 98765 43210',
      rules: 'Valid College ID card is mandatory for all registered participants. Respect schedule timings.',
      termsNotes: 'Decisions by the jury panel will be final and binding.',
      createdBy: 'user_admin_01',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'event_tech_2027',
      name: 'National Tech Symposium 2027',
      code: 'TECH27',
      slug: 'tech-fest-2027',
      description: 'Premier national technical symposium featuring hackathons, quizzes, robotics, and coding sprints.',
      venue: 'Innovation Center & Computing Labs',
      startDate: '2027-04-05T09:00:00Z',
      endDate: '2027-04-07T17:00:00Z',
      registrationStart: '2026-01-01T00:00:00Z',
      registrationEnd: '2027-12-31T23:59:59Z',
      status: 'ONGOING',
      logoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      contactInfo: 'techsymposium@college.edu | +91 98765 43212',
      rules: 'Strict adherence to code of conduct. Bring personal laptops for technical events.',
      termsNotes: 'Original work only. Plagiarism leads to immediate disqualification.',
      createdBy: 'user_admin_01',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const event of events) {
    await db.collection('events').doc(event.id).set(event);
  }

  // 3. Seed Programs
  const programs = [
    {
      id: 'prog_solo_dance',
      eventId: 'event_arts_2027',
      name: 'Solo Classical & Contemporary Dance',
      code: 'SD',
      slug: 'solo-dance',
      description: 'A 5-minute expressive solo dance performance showcasing rhythm, poise, and choreography.',
      category: 'Cultural',
      participationType: 'INDIVIDUAL',
      venue: 'Main Auditorium Stage A',
      date: '2027-03-15',
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      capacity: 30,
      registeredCount: 3,
      status: 'REGISTRATION_OPEN',
      registrationStart: '2026-01-01T00:00:00Z',
      registrationEnd: '2027-12-31T23:59:59Z',
      rules: 'Time limit: 4-5 minutes. Music tracks must be submitted in MP3 format before 9:00 AM.',
      instructions: 'Participants must report 30 minutes prior to the scheduled slot with college ID.',
      scoringConfig: {
        criteria: [
          { id: 'crit_tech', name: 'Technique & Skill', maxScore: 25, weight: 1, description: 'Footwork, posture, and technical execution' },
          { id: 'crit_expr', name: 'Expression & Bhavam', maxScore: 25, weight: 1, description: 'Facial expressions and emotive story-telling' },
          { id: 'crit_rhythm', name: 'Rhythm & Choreography', maxScore: 20, weight: 1, description: 'Timing, transitions, and stage usage' },
          { id: 'crit_costume', name: 'Costume & Presentation', maxScore: 15, weight: 1, description: 'Appropriate attire, prop handling' },
          { id: 'crit_impact', name: 'Overall Impression', maxScore: 15, weight: 1, description: 'Stage presence and audience impact' },
        ],
        totalMaxScore: 100,
        calculationMethod: 'SUM',
        pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
        tieBreakerRule: 'Highest score on Technique & Skill, then Expression',
        isJuryScoreVisibleToCoord: true,
      },
      registrationFields: [
        { id: 'f1', name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Ananya Nair' },
        { id: 'f2', name: 'registerNumber', label: 'College Register Number', type: 'text', required: true, placeholder: 'e.g. 23CSE042' },
        { id: 'f3', name: 'department', label: 'Department', type: 'select', required: true, options: ['Computer Science', 'Fine Arts', 'Electronics', 'Mechanical', 'Commerce', 'Civil'] },
        { id: 'f4', name: 'year', label: 'Academic Year', type: 'select', required: true, options: ['1st Year', '2nd Year', '3rd Year', '4th Year'] },
        { id: 'f5', name: 'phone', label: 'Phone Number', type: 'phone', required: true, placeholder: '10-digit mobile number' },
        { id: 'f6', name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'student@college.edu' },
        { id: 'f7', name: 'danceStyle', label: 'Dance Form / Style', type: 'text', required: true, placeholder: 'e.g. Bharatanatyam / Contemporary' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prog_tech_quiz',
      eventId: 'event_tech_2027',
      name: 'Grand Inter-Collegiate Tech Quiz',
      code: 'TQ',
      slug: 'tech-quiz',
      description: 'Battle of the sharpest technical minds spanning algorithms, AI, computing history, and emerging tech.',
      category: 'Technical',
      participationType: 'TEAM',
      venue: 'Innovation Hall B',
      date: '2027-04-05',
      startTime: '02:00 PM',
      endTime: '05:00 PM',
      capacity: 20,
      registeredCount: 3,
      status: 'JUDGING',
      registrationStart: '2026-01-01T00:00:00Z',
      registrationEnd: '2027-12-31T23:59:59Z',
      rules: 'Teams of 2 to 3 members. No mobile phones or electronic aids permitted in the arena.',
      instructions: 'Preliminary written qualifier round followed by buzzer finals on stage.',
      scoringConfig: {
        criteria: [
          { id: 'crit_accuracy', name: 'Factual Accuracy', maxScore: 40, weight: 1, description: 'Correct answers on core tech topics' },
          { id: 'crit_speed', name: 'Speed & Buzzer Reflex', maxScore: 30, weight: 1, description: 'Rapid response in buzzer round' },
          { id: 'crit_problemsolving', name: 'Problem Solving Round', maxScore: 30, weight: 1, description: 'Analytical question solving' },
        ],
        totalMaxScore: 100,
        calculationMethod: 'SUM',
        pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
        tieBreakerRule: 'Highest score in Problem Solving Round',
        isJuryScoreVisibleToCoord: true,
      },
      registrationFields: [
        { id: 'f10', name: 'teamName', label: 'Team Name', type: 'text', required: true, placeholder: 'e.g. Binary Beasts' },
        { id: 'f11', name: 'department', label: 'Department', type: 'select', required: true, options: ['Computer Science', 'Electronics', 'AI & Data Science', 'Information Tech'] },
        { id: 'f12', name: 'captainName', label: 'Team Captain Name', type: 'text', required: true, placeholder: 'Captain Name' },
        { id: 'f13', name: 'registerNumber', label: 'Captain Student ID', type: 'text', required: true, placeholder: 'e.g. 23CS010' },
        { id: 'f14', name: 'email', label: 'Captain Email', type: 'email', required: true, placeholder: 'captain@college.edu' },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const prog of programs) {
    await db.collection('programs').doc(prog.id).set(prog);
  }

  // 4. Seed Program Assignments (Crucial for testing coordinator & jury access boundaries!)
  const assignments = [
    {
      id: 'asgn_dance_coord',
      userId: 'user_coord_01',
      userName: 'Sarah Jenkins (Dance Coordinator)',
      userEmail: 'dance.coord@college.edu',
      role: 'coordinator',
      eventId: 'event_arts_2027',
      programId: 'prog_solo_dance',
      status: 'ACTIVE',
      assignedAt: now,
      assignedBy: 'user_admin_01',
    },
    {
      id: 'asgn_dance_jury',
      userId: 'user_jury_01',
      userName: 'Maestro David (Dance Jury)',
      userEmail: 'dance.judge@college.edu',
      role: 'jury',
      eventId: 'event_arts_2027',
      programId: 'prog_solo_dance',
      status: 'ACTIVE',
      assignedAt: now,
      assignedBy: 'user_admin_01',
    },
    {
      id: 'asgn_quiz_coord',
      userId: 'user_coord_02',
      userName: 'Alan Turing (Quiz Coordinator)',
      userEmail: 'quiz.coord@college.edu',
      role: 'coordinator',
      eventId: 'event_tech_2027',
      programId: 'prog_tech_quiz',
      status: 'ACTIVE',
      assignedAt: now,
      assignedBy: 'user_admin_01',
    },
    {
      id: 'asgn_quiz_jury',
      userId: 'user_jury_02',
      userName: 'Dr. Evelyn Fox (Quiz Jury)',
      userEmail: 'quiz.judge@college.edu',
      role: 'jury',
      eventId: 'event_tech_2027',
      programId: 'prog_tech_quiz',
      status: 'ACTIVE',
      assignedAt: now,
      assignedBy: 'user_admin_01',
    },
  ];

  for (const asgn of assignments) {
    await db.collection('assignments').doc(asgn.id).set(asgn);
  }

  // 5. Seed Registrations
  const registrations = [
    {
      id: 'reg_dance_01',
      registrationNumber: 'ARTS27-SD-0001',
      eventId: 'event_arts_2027',
      eventName: 'College Arts Fest 2027',
      programId: 'prog_solo_dance',
      programName: 'Solo Classical & Contemporary Dance',
      participantType: 'INDIVIDUAL',
      department: 'Fine Arts',
      participantData: {
        name: 'Ananya Nair',
        registerNumber: '23FA001',
        department: 'Fine Arts',
        year: '3rd Year',
        phone: '9845123456',
        email: 'ananya@college.edu',
        danceStyle: 'Bharatanatyam Semi-classical',
      },
      status: 'CONFIRMED',
      attendanceStatus: 'PRESENT',
      registeredAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: now,
    },
    {
      id: 'reg_dance_02',
      registrationNumber: 'ARTS27-SD-0002',
      eventId: 'event_arts_2027',
      eventName: 'College Arts Fest 2027',
      programId: 'prog_solo_dance',
      programName: 'Solo Classical & Contemporary Dance',
      participantType: 'INDIVIDUAL',
      department: 'Computer Science',
      participantData: {
        name: 'Rohan Verma',
        registerNumber: '23CS042',
        department: 'Computer Science',
        year: '2nd Year',
        phone: '9845123457',
        email: 'rohan.v@college.edu',
        danceStyle: 'Contemporary Lyrical',
      },
      status: 'CONFIRMED',
      attendanceStatus: 'PRESENT',
      registeredAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: now,
    },
    {
      id: 'reg_dance_03',
      registrationNumber: 'ARTS27-SD-0003',
      eventId: 'event_arts_2027',
      eventName: 'College Arts Fest 2027',
      programId: 'prog_solo_dance',
      programName: 'Solo Classical & Contemporary Dance',
      participantType: 'INDIVIDUAL',
      department: 'Electronics',
      participantData: {
        name: 'Pooja Hegde',
        registerNumber: '23EC108',
        department: 'Electronics',
        year: '4th Year',
        phone: '9845123458',
        email: 'pooja.h@college.edu',
        danceStyle: 'Kathak Classical',
      },
      status: 'CONFIRMED',
      attendanceStatus: 'PENDING',
      registeredAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: now,
    },
    // Quiz Registrations (Team)
    {
      id: 'reg_quiz_01',
      registrationNumber: 'TECH27-TQ-0001',
      eventId: 'event_tech_2027',
      eventName: 'National Tech Symposium 2027',
      programId: 'prog_tech_quiz',
      programName: 'Grand Inter-Collegiate Tech Quiz',
      participantType: 'TEAM',
      teamName: 'Binary Beasts',
      department: 'Computer Science',
      teamMembers: [
        { name: 'Kavya Raman', registerNumber: '23CS012', email: 'kavya@college.edu' },
        { name: 'Arjun Das', registerNumber: '23CS019', email: 'arjun@college.edu' },
      ],
      participantData: {
        teamName: 'Binary Beasts',
        department: 'Computer Science',
        captainName: 'Kavya Raman',
        registerNumber: '23CS012',
        email: 'kavya@college.edu',
      },
      status: 'CONFIRMED',
      attendanceStatus: 'PRESENT',
      registeredAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: now,
    },
    {
      id: 'reg_quiz_02',
      registrationNumber: 'TECH27-TQ-0002',
      eventId: 'event_tech_2027',
      eventName: 'National Tech Symposium 2027',
      programId: 'prog_tech_quiz',
      programName: 'Grand Inter-Collegiate Tech Quiz',
      participantType: 'TEAM',
      teamName: 'Quantum Quants',
      department: 'Electronics',
      teamMembers: [
        { name: 'Sameer Rao', registerNumber: '23EC008', email: 'sameer@college.edu' },
        { name: 'Priya Sen', registerNumber: '23EC021', email: 'priya@college.edu' },
      ],
      participantData: {
        teamName: 'Quantum Quants',
        department: 'Electronics',
        captainName: 'Sameer Rao',
        registerNumber: '23EC008',
        email: 'sameer@college.edu',
      },
      status: 'CONFIRMED',
      attendanceStatus: 'PRESENT',
      registeredAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: now,
    },
    {
      id: 'reg_quiz_03',
      registrationNumber: 'TECH27-TQ-0003',
      eventId: 'event_tech_2027',
      eventName: 'National Tech Symposium 2027',
      programId: 'prog_tech_quiz',
      programName: 'Grand Inter-Collegiate Tech Quiz',
      participantType: 'TEAM',
      teamName: 'Cyber Knights',
      department: 'Information Tech',
      teamMembers: [
        { name: 'Vikram Seth', registerNumber: '23IT004', email: 'vikram@college.edu' },
        { name: 'Naveen Kumar', registerNumber: '23IT015', email: 'naveen@college.edu' },
      ],
      participantData: {
        teamName: 'Cyber Knights',
        department: 'Information Tech',
        captainName: 'Vikram Seth',
        registerNumber: '23IT004',
        email: 'vikram@college.edu',
      },
      status: 'CONFIRMED',
      attendanceStatus: 'PRESENT',
      registeredAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: now,
    },
  ];

  for (const reg of registrations) {
    await db.collection('registrations').doc(reg.id).set(reg);
  }

  // 6. Seed Sample Submitted Scores for Tech Quiz (to immediately showcase leaderboard!)
  const quizScores = [
    {
      id: 'score_prog_tech_quiz_reg_quiz_01_user_jury_02',
      programId: 'prog_tech_quiz',
      registrationId: 'reg_quiz_01',
      juryId: 'user_jury_02',
      juryName: 'Dr. Evelyn Fox (Quiz Jury)',
      criteriaScores: {
        crit_accuracy: 38,
        crit_speed: 28,
        crit_problemsolving: 28,
      },
      totalScore: 94,
      feedback: 'Outstanding technical agility and speed in buzzer round.',
      status: 'SUBMITTED',
      submittedAt: now,
      updatedAt: now,
    },
    {
      id: 'score_prog_tech_quiz_reg_quiz_02_user_jury_02',
      programId: 'prog_tech_quiz',
      registrationId: 'reg_quiz_02',
      juryId: 'user_jury_02',
      juryName: 'Dr. Evelyn Fox (Quiz Jury)',
      criteriaScores: {
        crit_accuracy: 35,
        crit_speed: 26,
        crit_problemsolving: 27,
      },
      totalScore: 88,
      feedback: 'Great precision in hardware and physics questions.',
      status: 'SUBMITTED',
      submittedAt: now,
      updatedAt: now,
    },
    {
      id: 'score_prog_tech_quiz_reg_quiz_03_user_jury_02',
      programId: 'prog_tech_quiz',
      registrationId: 'reg_quiz_03',
      juryId: 'user_jury_02',
      juryName: 'Dr. Evelyn Fox (Quiz Jury)',
      criteriaScores: {
        crit_accuracy: 32,
        crit_speed: 24,
        crit_problemsolving: 25,
      },
      totalScore: 81,
      feedback: 'Good effort, missed a few buzzer rounds.',
      status: 'SUBMITTED',
      submittedAt: now,
      updatedAt: now,
    },
  ];

  for (const s of quizScores) {
    await db.collection('scores').doc(s.id).set(s);
  }

  // 7. Seed Published Results for Tech Quiz
  const quizResults = [
    {
      id: 'res_prog_tech_quiz_reg_quiz_01',
      programId: 'prog_tech_quiz',
      programName: 'Grand Inter-Collegiate Tech Quiz',
      eventId: 'event_tech_2027',
      registrationId: 'reg_quiz_01',
      registrationNumber: 'TECH27-TQ-0001',
      participantName: 'Binary Beasts',
      teamName: 'Binary Beasts',
      department: 'Computer Science',
      rank: 1,
      position: '1st',
      totalScore: 94,
      averageScore: 94,
      pointsAwarded: 5,
      resultStatus: 'PUBLISHED',
      calculatedAt: now,
      publishedAt: now,
    },
    {
      id: 'res_prog_tech_quiz_reg_quiz_02',
      programId: 'prog_tech_quiz',
      programName: 'Grand Inter-Collegiate Tech Quiz',
      eventId: 'event_tech_2027',
      registrationId: 'reg_quiz_02',
      registrationNumber: 'TECH27-TQ-0002',
      participantName: 'Quantum Quants',
      teamName: 'Quantum Quants',
      department: 'Electronics',
      rank: 2,
      position: '2nd',
      totalScore: 88,
      averageScore: 88,
      pointsAwarded: 3,
      resultStatus: 'PUBLISHED',
      calculatedAt: now,
      publishedAt: now,
    },
    {
      id: 'res_prog_tech_quiz_reg_quiz_03',
      programId: 'prog_tech_quiz',
      programName: 'Grand Inter-Collegiate Tech Quiz',
      eventId: 'event_tech_2027',
      registrationId: 'reg_quiz_03',
      registrationNumber: 'TECH27-TQ-0003',
      participantName: 'Cyber Knights',
      teamName: 'Cyber Knights',
      department: 'Information Tech',
      rank: 3,
      position: '3rd',
      totalScore: 81,
      averageScore: 81,
      pointsAwarded: 1,
      resultStatus: 'PUBLISHED',
      calculatedAt: now,
      publishedAt: now,
    },
  ];

  for (const r of quizResults) {
    await db.collection('results').doc(r.id).set(r);
  }

  // Update program status for tech quiz
  await db.collection('programs').doc('prog_tech_quiz').update({
    status: 'RESULTS_PUBLISHED',
  });

  console.log('✅ Initial seed data populated successfully!');
}
