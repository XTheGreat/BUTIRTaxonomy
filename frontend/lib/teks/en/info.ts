import type id from "../id/info";

const info: typeof id = {
  halaman: {
    masuk: "Sign in",
    kembaliKeMasuk: "Back to sign in",
  },
  panduan: {
    judul: "User Guide",
    ringkasan: "A quick walkthrough for teachers or lecturers and for students.",
    guru: {
      judul: "For teachers or lecturers",
      langkah: [
        ["Sign up and sign in", "Create a teacher or lecturer account on the Sign-up page, then sign in with your email and password."],
        ["Upload course material", "In the Course Material menu, upload a PDF, DOCX, TXT, or MD file (up to 10 MB)."],
        ["Build a blueprint", "In the Blueprint menu, choose the material, the number of items, and a Bloom level mix that totals 100%. The name and chapter scope are optional."],
        ["Start generation", "Run generation and follow the agent debate through View live debate on each item."],
        ["Review the results", "Accepted items go to the Question Bank. Check Flagged Items and Pending Items if there are any, then accept, edit, or retry."],
        ["Assemble an exam", "In Assemble Exam, pick items manually or assemble automatically from the Bloom mix, then publish the package."],
        ["Share the access code", "Give students the exam access code. Results can be released automatically or held until you allow them."],
      ],
    },
    siswa: {
      judul: "For students",
      langkah: [
        ["Open the sign-in page", "Choose the Student tab on the sign-in page."],
        ["Enter the access code", "Enter the access code from your teacher or lecturer, then type your name."],
        ["Take the exam", "Answer the questions before time runs out. Your answers are saved each time you select an option."],
        ["See your results", "Results appear once your teacher or lecturer releases them."],
      ],
    },
    tips: {
      judul: "Tips",
      butir: [
        "Higher-level questions (C5 and C6) are harder to generate, so some of those items may be flagged or pending.",
        "Items are usually pending because the AI service is having problems. Open Pending Items and click Retry.",
        "Always re-read AI-generated items before using them for official assessment.",
      ],
    },
  },
  privasi: {
    judul: "Privacy Policy",
    ringkasan:
      "A summary of what data BUTIR collects and how it is used. Last updated: October 26, 2026.",
    data: {
      judul: "Data we store",
      butir: [
        ["Teacher or lecturer accounts:", "name, email address, and password. Passwords are stored as a hash, not as plain text."],
        ["Teacher or lecturer work content:", "uploaded course material, blueprints, exam items and their debate history, exam packages, and reports."],
        ["Students:", "the name typed when joining an exam, and exam answers. Students don't create accounts. A secret token is stored on the student's device to identify them during the exam."],
        ["Technical logs:", "the time, model name, token count, and status of each request to the AI service, used to monitor usage and errors."],
      ],
    },
    ai: {
      judul: "Use of AI services",
      isi: "To generate and review items, excerpts of course material and question text are sent to a third-party AI model provider for processing. The content of those requests is not stored in BUTIR's technical logs. Don't upload material that is confidential or contains personal data that must not be processed by a third party.",
    },
    sesi: {
      judul: "Session security",
      isi: "Teacher and lecturer sign-in sessions are time-limited and can be revoked when you sign out. Even so, no system is completely risk-free, and we can't guarantee absolute security.",
    },
    pembagian: {
      judul: "Use and sharing of data",
      isi: "Data is used only to run BUTIR's features. We don't sell data. Data may be accessible to the service providers used to run the system, such as the hosting provider and the AI model provider mentioned above.",
    },
    penghapusan: {
      judul: "Data deletion and questions",
      isi: "Teachers and lecturers can delete material, blueprints, and items from their own accounts. To request deletion of an account or of student data, or if you have questions, contact us using the details at the bottom of the page.",
    },
    catatanAkhir: "This document is an early summary for the development stage and may change.",
  },
  syarat: {
    judul: "Terms of Use",
    ringkasan:
      "The basic rules for using BUTIR. By using the service you agree to them. Last updated: October 26, 2026.",
    pemakaian: {
      judul: "Fair use",
      isi: "BUTIR is for drafting and running legitimate exams. You may not use it to break the law, disrupt the service, access other people's accounts, or send excessive automated requests.",
    },
    materi: {
      judul: "Material you upload",
      isi: "You are responsible for the material you upload, including its copyright and usage permissions. Only upload material you have the right to use.",
    },
    hasilAi: {
      judul: "AI-generated output",
      isi: "Exam items are generated and reviewed by AI models, which can make mistakes. The output is an aid, not a final decision. Teachers and lecturers are responsible for reviewing every item before using it for assessment.",
    },
    ketersediaan: {
      judul: "Service availability",
      isi: "BUTIR is still in early development and is provided as is, with no guarantee of continuous availability. Features, usage limits, and plans may change. Keep copies of your important items using the export feature.",
    },
    pembatasan: {
      judul: "Account restrictions",
      isi: "An account may be restricted or suspended if it is found to violate these terms or endanger the service.",
    },
    catatanAkhir: "This document is an early summary for the development stage and may change.",
  },
  tentang: {
    judul: "About BUTIR",
    ringkasan:
      "A system for drafting and validating exam items faster, with teachers or lecturers keeping the final decision.",
    apaItu: {
      judul: "What is BUTIR",
      isi: "BUTIR helps teachers or lecturers create multiple-choice questions that have been reviewed before they reach students. You upload course material and set a blueprint with the Bloom's taxonomy level mix (C1 to C6), and the system generates exam items and tests them through a debate between AI agents.",
    },
    agen: {
      judul: "Four agents in one debate",
      daftar: [
        ["Drafter", "writes multiple-choice items from the material you upload, at the requested Bloom level."],
        ["Critic", "reviews each question against five rubric aspects and suggests improvements."],
        ["Blind Answerer", "answers the question without being told the answer key, to test whether it is clear and unambiguous."],
        ["Arbiter", "decides whether the item is accepted, needs revision, or is rejected, and judges its actual cognitive level."],
      ],
      penutup: "The debate runs for up to three rounds per item. Items that pass go to the Question Bank. Items without agreement are flagged so the teacher or lecturer can review them before use.",
    },
    dariSoalSampaiUjian: {
      judul: "From questions to exams",
      isi: "Accepted items can be assembled into an exam package, published with an access code, and taken by students without creating an account. Teachers and lecturers can view an item analysis report once the exam is over.",
    },
    status: {
      judul: "Project status",
      isi: "BUTIR is still in early development by a single developer. Features and the interface may change, and AI-generated output always needs to be reviewed by the teacher or lecturer before it is used for assessment. For questions or feedback, use the contact details at the bottom of the page.",
    },
  },
};

export default info;
