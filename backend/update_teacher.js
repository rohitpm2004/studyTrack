import mongoose from 'mongoose';
import 'dotenv/config';

const update = async () => {
  try {
    const uri = 'mongodb+srv://kirsagarmenaka_db_user:rohit12345@cluster0.7qxqsb9.mongodb.net/studytrack';
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const result = await mongoose.connection.collection('users').updateOne(
      { name: 'asiya', role: 'teacher' },
      { $set: { department: 'Computer Science Department' } }
    );

    console.log(`Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

update();
