import mongoose from "mongoose";
import User from "./src/models/UserModel.js";
import connectDB from "./src/config/db.js";
import "dotenv/config";

const seedAdmin = async () => {
  try {
    console.log("⏳ Menghubungkan ke MongoDB...");
    await connectDB();

    const adminUsername = "admin_mapan";
    const adminPhone = "081234567890";

    const existingAdmin = await User.findOne({
      $or: [{ username: adminUsername }, { phone: adminPhone }],
    });

    if (existingAdmin) {
      console.log("⚠️ Admin udah nangkring, Bre! Gak perlu seed lagi.");
      process.exit(0);
    }

    // Pake 'as const' biar sesuai sama literal type di UserModel lu
    const adminData = {
      username: adminUsername,
      password: "testing77",
      fullname: "Super Admin Mapan",
      phone: adminPhone,
      role: "admin" as const, // Fix: Biar gak dianggap string umum
      shift: "pagi" as const, // Fix: Biar gak dianggap string umum
      profilePhoto: { url: "", publicId: "" },
      assignedWorkLocations: [],
      isVerified: true,
      status: "active" as const, // Fix: Biar gak dianggap string umum[cite: 9]
      basicSalary: 5000000,
      bpjsKesehatan: true,
      bpjsKetenagakerjaan: true,
    };

    await User.create(adminData);
    console.log("✅ Admin Mapan Berhasil Ditanam!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Gagal Total, Cek Koneksi Bre:", error);
    process.exit(1);
  }
};

seedAdmin();
