import mongoose from 'mongoose';
import 'dotenv/config';

const test = async () => {
  try {
    const uri = 'mongodb+srv://kirsagarmenaka_db_user:rohit12345@cluster0.7qxqsb9.mongodb.net/studytrack';
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const teacherDept = 'Computer Science';
    const deptMatch = teacherDept.replace(/ Department$/, "");
    const regex = new RegExp(`^${deptMatch}`, "i");
    
    console.log(`Matching for: "${deptMatch}" with regex: ${regex}`);

    const students = await mongoose.connection.collection('users').find({
      department: { $regex: regex },
      role: 'student'
    }).toArray();

    console.log(`Found ${students.length} students:`);
    students.forEach(s => console.log(`- ${s.name} (${s.department})`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

test();
