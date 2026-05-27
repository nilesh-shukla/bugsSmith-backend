import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

app.post('/predict', (req, res) => {
  // Accept either a single profile or an array
  const payload = req.body;
  const makeResponse = () => ({
    risk_score: Math.floor(Math.random() * 100),
    status: Math.random() > 0.5 ? 'suspicious' : 'genuine',
    confidence: +(Math.random() * 0.5 + 0.5).toFixed(3),
    featureContributions: { followers: +(Math.random() * 2 - 1).toFixed(3), bioLength: +(Math.random() * 2 - 1).toFixed(3) },
    anomalies: Math.random() > 0.7 ? ['rare_location'] : [],
    raw: payload
  });

  if (Array.isArray(payload)) {
    return res.json(payload.map(() => makeResponse()));
  }
  return res.json(makeResponse());
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Mock ML server listening on http://localhost:${port}`));
