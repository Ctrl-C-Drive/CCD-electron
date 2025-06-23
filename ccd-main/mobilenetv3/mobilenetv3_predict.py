import onnxruntime as ort
import torch
from PIL import Image
from torchvision import transforms
import os
from Classes import CLASSES
from typing import List

MODEL_PATH = os.path.join(os.path.dirname(__file__), "mobilenetv3_trained_newnew.onnx")
THRESHOLD = 0.5

# 이미지 전처리
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# 모델 세션 불러오기 (한 번만)
session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

def predict_tags(imagePath: str) -> List[str]:   
    # 파일 없으면 실패
    if not imagePath:
        return False

    try:
        image = Image.open(imagePath).convert("RGB")
        input_tensor = transform(image).unsqueeze(0).numpy()

        output = session.run([output_name], {input_name: input_tensor})[0]
        probs = torch.sigmoid(torch.tensor(output)).squeeze().tolist()
        predicted = [CLASSES[i] for i, p in enumerate(probs) if p >= THRESHOLD]
        return predicted
    except Exception as e:
        print(f"Error in predict_tags: {e}")
        return []