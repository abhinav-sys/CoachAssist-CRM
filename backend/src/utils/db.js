import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coachassist';
  if (!uri.includes('mongodb.net') && !uri.startsWith('mongodb://localhost')) {
    throw new Error(
      'MONGODB_URI must be a full connection string from MongoDB Atlas. ' +
      'Example: mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/coachassist?retryWrites=true&w=majority'
    );
  }
  // If password contains @, the host is parsed wrong (e.g. host becomes "123"). Detect and help.
  if (uri.startsWith('mongodb+srv://')) {
    const afterAt = uri.indexOf('@');
    if (afterAt !== -1) {
      const hostPart = uri.slice(afterAt + 1).split('/')[0].split('?')[0];
      if (!hostPart.includes('.mongodb.net') && hostPart.length < 20) {
        throw new Error(
          'MONGODB_URI host looks wrong (got "' + hostPart + '"). ' +
          'If your password contains @ or #, URL-encode it: @ → %40, # → %23. ' +
          'Example: password Abhi@123 → use Abhi%40123 in the URI.'
        );
      }
    }
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
