document.addEventListener("DOMContentLoaded", () => {

  // Get elements
  const fileInput = document.getElementById("fileInput");
  const previewImage = document.getElementById("preview");

  // When user selects image
  fileInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    // Allow only images
    if (!file.type.startsWith("image/")) {
      alert("Only image files allowed");
      fileInput.value = "";
      return;
    }

    // Show instantly in UI
    const imageURL = URL.createObjectURL(file);

    previewImage.src = imageURL;

  });

}); 