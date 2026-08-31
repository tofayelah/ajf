export const processImageFile = (file: File, maxSizeMB: number = 5): Promise<string> => {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (!validTypes.includes(file.type)) {
      return reject(new Error('এই ছবির ফরম্যাট সমর্থিত নয়। (This image format is not supported.)'));
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return reject(new Error(`ছবির আকার ${maxSizeMB} MB-এর বেশি হতে পারবে না। (Image size cannot exceed ${maxSizeMB} MB.)`));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
