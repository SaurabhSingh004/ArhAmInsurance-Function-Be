const medicineService = require('../services/MedicineService');
const {logError} = require('../utils/logError');

class MedicineController {

    addMedicineToSchedule = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { medicines } = await request.json() || {};

            // Validate input
            if (!Array.isArray(medicines) || medicines.length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        error: "Invalid input. 'medicines' array is required."
                    }
                };
            }

            const result = await medicineService.addMedicine(userId, medicines);
            
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: "Medicine schedule successfully recorded.",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('addMedicineToSchedule', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    error: err.message || "An error occurred while saving the medicine schedule."
                }
            };
        }
    }

    getMedicineSchedule = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { date } = request.params || {};

            if (!date) {
                return {
                    status: 400,
                    jsonBody: {
                        error: "date is required in path parameters."
                    }
                };
            }

            const result = await medicineService.getMedicineSchedule(userId, date);
            
            return {
                status: 200,
                jsonBody: { 
                    success: true, 
                    data: result 
                }
            };
        } catch (error) {
            const err = logError('getMedicineSchedule', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: { 
                    error: "An error occurred while fetching the medicine schedule.",
                    details: err.message 
                }
            };
        }
    }

    updateMedicineStatus = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { medicineId, timeSlot, isTaken } = await request.json() || {};
            const { date } = request.params || {};

            if (!medicineId || !timeSlot || isTaken === undefined) {
                return {
                    status: 400,
                    jsonBody: {
                        error: "medicineId, timeSlot, and isTaken are required in request body."
                    }
                };
            }

            if (!date) {
                return {
                    status: 400,
                    jsonBody: {
                        error: "date is required in path parameters."
                    }
                };
            }

            const result = await medicineService.updateMedicineStatus(
                userId,
                medicineId,
                date,
                timeSlot,
                isTaken
            );

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Medicine taken status updated successfully",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('updateMedicineStatus', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: { 
                    error: "An error occurred while updating medicine taken status.",
                    details: err.message 
                }
            };
        }
    }

    searchMedicines = async (request, context) => {
        try {
            const { query, page = 1, limit = 10 } = request.query || {};
            
            if (!query) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Search query is required"
                    }
                };
            }
    
            const result = await medicineService.searchMedicines({
                query,
                page,
                limit
            });
    
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            context.error('Error in searchMedicines:', error);
            const err = logError('searchMedicines', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: "An error occurred while searching medicines"
                }
            };
        }
    }

    seedMedicines = async (request, context) => {
        try {
            const result = await medicineService.seedMedicines();
            
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: "Medicine seed successfully done.",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('seedMedicines', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message || "An error occurred while creating the medicine."
                }
            };
        }
    }

    createMedicine = async (request, context) => {
        try {
            const reqData = await request.json();
            // Validate input
            if (!reqData?.name || !reqData?.dosage) {
                return {
                    status: 400,
                    jsonBody: {
                        error: "Invalid input. 'name' and 'dosage' are required."
                    }
                };
            }

            const result = await medicineService.createMedicine(reqData || {});
            
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: "Medicine successfully created.",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('createMedicine', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message || "An error occurred while creating the medicine."
                }
            };
        }
    }

    getAllMedicines = async (request, context) => {
        try {
            const result = await medicineService.getAllMedicines();
            
            return {
                status: 200,
                jsonBody: { 
                    success: true, 
                    data: result 
                }
            };
        } catch (error) {
            const err = logError('getAllMedicines', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: { 
                    success: false,
                    error: "An error occurred while fetching medicines.",
                    details: err.message 
                }
            };
        }
    }

    getMedicineById = async (request, context) => {
        try {
            const { id } = request.params || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Medicine ID is required."
                    }
                };
            }

            const result = await medicineService.getMedicineById(id);
            
            if (!result) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: "Medicine not found."
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getMedicineById', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: { 
                    success: false,
                    error: "An error occurred while fetching the medicine.",
                    details: err.message 
                }
            };
        }
    }

    updateMedicine = async (request, context) => {
        try {
            const { id } = request.params || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Medicine ID is required."
                    }
                };
            }

            const reqData = await request.json();
            if (!reqData || Object.keys(reqData).length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Update data is required."
                    }
                };
            }

            const result = await medicineService.updateMedicine(id, reqData);

            if (!result) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: "Medicine not found."
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Medicine updated successfully",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('updateMedicine', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: { 
                    success: false,
                    error: "An error occurred while updating the medicine.",
                    details: err.message 
                }
            };
        }
    }

    deleteMedicine = async (request, context) => {
        try {
            const { id } = request.params || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Medicine ID is required."
                    }
                };
            }

            const result = await medicineService.deleteMedicine(id);

            if (!result) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: "Medicine not found."
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Medicine deleted successfully"
                }
            };
        } catch (error) {
            const err = logError('deleteMedicine', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: { 
                    success: false,
                    error: "An error occurred while deleting the medicine.",
                    details: err.message 
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new MedicineController();