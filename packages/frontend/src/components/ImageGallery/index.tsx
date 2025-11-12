import { Image, Space } from 'antd';
import type { UploadFile } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import styles from './styles.module.css';

interface ImageGalleryProps {
  fileList: UploadFile[];
}

const ImageGallery = ({ fileList }: ImageGalleryProps) => {
  const images = fileList
    .filter((f) => f.status === 'done' && (f.url || f.thumbUrl))
    .map((f) => ({
      src: f.url || f.thumbUrl || '',
      alt: f.name,
    }));

  if (images.length === 0) {
    return (
      <div className={styles.gallerySkeleton}>
        <div className={styles.skeletonIcon}>
          <PictureOutlined />
        </div>
        <div className={styles.skeletonText}>Фото не загружено</div>
      </div>
    );
  }

  return (
    <Image.PreviewGroup items={images}>
      <Space size={8} wrap>
        {images.map((image, index) => (
          <Image
            key={index}
            src={image.src}
            alt={image.alt}
            width={120}
            height={120}
            className={styles.galleryImage}
            style={{ objectFit: 'cover', borderRadius: 8 }}
          />
        ))}
      </Space>
    </Image.PreviewGroup>
  );
};

export default ImageGallery;
