import axios from 'axios';
const checkFakeProfile = async (req, res) => {
    try{
        const profileData = req.body;

        const response = await axios.post(
            ["http://127.0.0.1:5000/predict", process.env.ML_SERVICE_URL],
            profileData
        );

        return res.status(200).json({
            success: true,
            result: response.data
        });
    } catch(error){
        console.error("Prediction Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Prediction service failed"
        });
    }
}

export { checkFakeProfile };