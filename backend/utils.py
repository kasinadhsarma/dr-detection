
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

class DRDataGenerator:
    def __init__(self, data_dir, img_size=(224, 224), batch_size=32, validation_split=0.2):
        self.data_dir = data_dir
        self.img_size = img_size
        self.batch_size = batch_size
        self.validation_split = validation_split
        self.datagen = ImageDataGenerator(
            rescale=1./255,
            validation_split=self.validation_split,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode='nearest'
        )

    def get_train_generator(self):
        return self.datagen.flow_from_directory(
            self.data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='training'
        )

    def get_validation_generator(self):
        return self.datagen.flow_from_directory(
            self.data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='validation'
        )