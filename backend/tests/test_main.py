import unittest
from unittest.mock import patch, MagicMock
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import tensorflow as tf
import cv2
import numpy as np
from backend.main import load_model, predict, main

class TestMainFunctions(unittest.TestCase):

    def setUp(self):
        self.model_path = 'test_model.h5'
        self.image_path = 'test_data/test_image1.jpg'
        self.data_dir = Path('test_data')

    def tearDown(self):
        if os.path.exists(self.model_path):
            os.remove(self.model_path)
        if os.path.exists(self.image_path):
            os.remove(self.image_path)

    @patch('tensorflow.keras.models.load_model')
    def test_load_model(self, mock_load_model):
        mock_load_model.return_value = MagicMock()
        model = load_model(self.model_path)
        mock_load_model.assert_called_once_with(self.model_path)
        self.assertIsNotNone(model)

    @patch('cv2.imread')
    @patch('tensorflow.keras.models.Model.predict')
    def test_predict(self, mock_predict, mock_imread):
        mock_imread.return_value = np.zeros((224, 224, 3), dtype=np.uint8)
        mock_predict.return_value = np.array([[0, 1, 0, 0, 0]])
        model = MagicMock()
        prediction = predict(self.image_path, model)
        mock_imread.assert_called_once_with(self.image_path)
        mock_predict.assert_called_once()
        self.assertEqual(prediction, 1)

    @patch('backend.main.main')
    def test_main(self, mock_main):
        mock_main.return_value = None
        main(self.data_dir)
        mock_main.assert_called_once_with(self.data_dir)

if __name__ == '__main__':
    unittest.main()
