import { USER_PROJECT_SCHEMA } from "../schema/database";

class UserProject {
    constructor(userId, templateId, title, status, startDate, dailyMeetingTime, team, finalReport, grade) {
        this.userId = userId;
        this.templateId = templateId;
        this.title = title;
        this.status = status;
        this.startDate = startDate;
        this.dailyMeetingTime = dailyMeetingTime;
        this.team = team;
        this.finalReport = finalReport;
        this.grade = grade;
    }

    toFirestore() {
    // Always use schema from database.js
    const doc = {};
    for (const key of Object.keys(USER_PROJECT_SCHEMA)) {
        if (this[key] !== undefined) {
        doc[key] = this[key];
        }
    }
    return doc;
    }
    
    static fromFirestore(snapshot) {
        const data = snapshot.data();
        return new UserProject(
            data.userId,
            data.templateId,
            data.title,
            data.status,
            this.startDate,
            this.dailyMeetingTime,
            this.team,
            this.finalReport,
            this.grade,
        );
    }
}

export default UserProject;


