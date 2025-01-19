import cv2
import numpy as np
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from tqdm import tqdm
import argparse

def preprocess_image(image_path: Path, output_path: Path, size=(224, 224)):
    """Preprocess single image with medical image specific enhancements"""
    try:
        # Read image
        img = cv2.imread(str(image_path))
        if img is None:
            return False
        
        # Convert to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Resize
        img = cv2.resize(img, size)
        
        # Apply CLAHE
        lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
        
        # Save processed image
        cv2.imwrite(str(output_path), cv2.cvtColor(enhanced, cv2.COLOR_RGB2BGR))
        return True
    except Exception as e:
        print(f"Error processing {image_path}: {str(e)}")
        return False

def preprocess_dataset(input_dir: Path, output_dir: Path):
    """Preprocess entire dataset using parallel processing"""
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    image_paths = list(input_dir.glob("*.jpeg"))
    
    with ProcessPoolExecutor() as executor:
        futures = []
        for img_path in image_paths:
            output_path = output_dir / img_path.name
            futures.append(
                executor.submit(preprocess_image, img_path, output_path)
            )
        
        for _ in tqdm(futures):
            _.result()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Preprocess DR detection dataset')
    parser.add_argument('--input-dir', type=str, required=True,
                      help='Path to raw images directory')
    parser.add_argument('--output-dir', type=str, required=True,
                      help='Path to save processed images')
    
    args = parser.parse_args()
    preprocess_dataset(Path(args.input_dir), Path(args.output_dir))
