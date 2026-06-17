import axios from 'axios';
const checkFakeProfile = async (req, res) => {
    try{
        const profileData = req.body;

        const ML_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5000/predict";

        const response = await axios.post(
            {ML_URL},
            profileData
         );

        // const response = await axios.post(
        //     [process.env.ML_SERVICE_URL],
        //     profileData
        // );

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