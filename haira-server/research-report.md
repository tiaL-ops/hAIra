
# hAIra

> The name hAIra is derived from the Malagasy word “hay raha” which translates as "the ability to create and critique art".

## Human–AI Teaming Platform for Research and Collaboration Skills Development

### Abstract

Generative Artificial Intelligence (AI) has become a powerful learning companion but risks diminishing students’ cognitive and collaborative skills if used passively. We present **hAIra**, an educational web platform designed to strengthen cognitive skills in the age of AI. **hAIra** integrates Chrome AI APIs (via client side), along with Google’s Gemini Developer API and Firebase to simulate realistic, short-term industry-style projects where students collaborate with AI teammates and are graded by an AI project manager.
The platform aims to enhance critical thinking, collaboration, and AI literacy. With hAIra, we aim to help humans think better, not less.

-----

## INTRODUCTION

Recent studies suggest that over-reliance on conversational AI can negatively impact students’ analytical reasoning, decision-making, and critical thinking abilities - skills essential for adaptive learning and professional success [1], [2].

Students often hold unrealistic expectations of what AI can accomplish, leading to either overtrust or misuse of AI-generated contributions [4]. Lodge, Yang, Furze, and Dawson [3] argue that generative AI cannot simply be treated as a “calculator” for learning; instead, there exist multiple modes of student–AI interaction, such as individual vs. collaborative and off-loading vs. extending. When AI operates in a collaborative role, learners must still engage as decision-makers and evaluators rather than passive receivers [3].

Further, Marrone, Zamecnik, Joksimovic, Johnson, and De Laat [4] show that when students work with AI as teammates, they primarily assess two dimensions: trust and capability.

In hAIra, we address these findings by emphasizing human–AI collaboration. The human student remains the leader, while AI teammates and project managers serve as collaborators.

When collaborating and co-writing documents , students are invited to pause and reflect on what AI provides. With the integrated reflective prompts featuring both ideal teammates , non ideal teammates and feedback mechanisms, hAIra encourages students to distinguish what the AI contributed versus what they decided.

-----

## PROJECT OVERVIEW

### Problem Statement

Educational systems lack interactive tools that teach students how to collaborate effectively with AI while maintaining their own cognitive agency. Existing AI-assisted learning often promotes passive use rather than active, reflective engagement.

Students today frequently use AI passively—for example, through chatbots that generate ready-made answers or AI tools that produce content students are meant to create themselves. This limits the development of critical thinking, synthesis, analysis, and decision-making skills.

Therefore, we need tools that help students **collaborate with AI, not depend on it.**

### Objective

hAIra seeks to create a web platform where students work on industry-style projects and learn teamwork by collaborating with AI teammates on short, project-based tasks that simulate real-world professional environments.

### Design Goals

  * Encourage active learning and AI literacy.
  * Model human–AI teamwork in realistic project contexts.
  * Offer gamified, feedback-driven learning experiences.

-----

## KEY FEATURES

| Feature | Description |
| --- | --- |
| **Gamified UI** | A fun, interactive user experience. |
| **Classroom** | Students meet different AI teammates ( Ideal and non ideal teammates). Each project involves one human user and at most two AI teammates. |
| **Projects** | Students are provided with a list of topics. They can choose one and ask the AI to generate a project related to the selected topic, or pick an existing project template for that topic. |
| **Group Chat** | Here the user can talk to their teammate , ask for advice , discuss on how to proceed with the project. |
| **AI Teammate Character Design** | AI teammates possess distinct personalities inspired by teamwork literature [5], representing diverse collaboration styles, from highly cooperative . Yet we also added constructively challenging ones. |
| **Task board** | Students may use Gen AI to help them break down tasks into small tasks. |
| **Custom Rich Text Editor** | A built-in document editor that allows students and AI agents to co-author project content in real time, with individual contribution tracking. |
| **GenAI Submission Board** | The workspace where students and AI teammates collaborate on the final project report. Key functions include: <br> • **Write:** Students can request AI teammates to draft or expand sections. <br> • **Review:** AI teammates provide targeted feedback or revision suggestions. <br> • **Summary:** AI-generated summaries highlight missing components or inconsistencies. <br> • **Proofreading:** AI checks grammar, tone, and writing style coherence. |
| **GenAI : Results and Feedback** | Upon submission, the system provides: <br> • **Grades:** Overall and category-specific performance scores (report quality, responsiveness, contribution balance). <br> • **Feedback:** AI-generated analysis highlighting strengths, weaknesses, and actionable areas for improvement. |

-----

## USER STORY

This is the path a user will take through the application:

1.  **Landing Page:** User sees an explanation of the app's purpose: learning research and teamwork.
2.  **Login:** User signs in.
3.  **Profile:** User can view their own profile, update their preference
4.  **Project theme:** Users view different types of project and topics, and choose.
5.  **Team Formation:** The user chooses a project and is matched with two AI teammates.
6.  **Group Chat:** The team uses a chat room to communicate.
7.  **Kanban Board:** The team uses a Kanban board to track tasks.
8.  **Built in Docs:** The team works on their final report in an integrated text editor.
9.  **Submission:** After one week, the team submits their project.
10. **Summary:** The user receives grades and feedback.

-----

## TECHNICAL STACK

  * **Frontend:** React
  * **Backend:** Node.js (Express).
  * **Database:** Firebase Firestore and Authentication.
  * **AI Integration:**
      * Google Gemini Nano API (Chrome AI API: Writer, Summarize, Proofread)
      * Gemini API client side
      * OpenAI API for prompting.
  * **Deployment:** Firebase Hosting

-----

## REFERENCES

[1] The effects of over-reliance on AI dialogue systems on students’ cognitive abilities: a systematic review, Smart Learning Environments, 2023.

[2] L. Stasielowicz, “How important is cognitive ability when adapting to changes? A meta-analysis of the performance adaptation literature,” Personality and Individual Differences, vol. 166, p. 110178, 2020.

[3] J. M. Lodge, S. Yang, L. Furze, and P. Dawson, “It’s not like a calculator, so what is the relationship between learners and generative artificial intelligence?,” Learning: Research and Practice, 2023.

[4] R. Marrone, A. Zamecnik, S. Joksimovic, J. Johnson, and M. De Laat, “Understanding student perceptions of artificial intelligence as a teammate,” Technology, Knowledge and Learning, vol. 30, no. 3, pp. 1847–1869, 2025.

[5] Elaborating team roles for artificial intelligence-based teammates in human–AI collaboration, 2021.

[6] S. O’Connell, “Cultivating the creative ecosystem amid the disruption of AI,” Science Advances, 2023.