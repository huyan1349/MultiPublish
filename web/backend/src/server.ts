import { app } from './app.js';

const PORT = process.env.PORT || 4395;

app.listen(PORT, () => {
  console.log(`ContentBridge backend running on http://localhost:${PORT}`);
});
