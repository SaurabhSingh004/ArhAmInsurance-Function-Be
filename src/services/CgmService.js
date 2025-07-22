const stats = require("stats-lite");
const cgmModel = require('../models/cgmDevice');
const cgmCalculatedDataModel = require('../models/cgmCalculatedData');
const { logError } = require('../utils/logError');
const StreakService = require('./StreakService');
class CgmService {
    static async validateGlucoseData(data, userId) {
        try {
            if (!data || Object.keys(data).length === 0) {
                throw new Error('Invalid glucose data: Data cannot be empty');
            }

            Object.entries(data).forEach(([timestamp, value]) => {
                if (isNaN(value) || value < 0 || value > 400) {
                    throw new Error(`Invalid glucose value at ${timestamp}: ${value}`);
                }
                if (isNaN(new Date(parseInt(timestamp)).getTime())) {
                    throw new Error(`Invalid timestamp: ${timestamp}`);
                }
            });
            return true;
        } catch (error) {
            throw logError('validateGlucoseData', error, { userId });
        }
    }

    static async calculateMean(values, userId) {
        try {
            if (!values.length) return 0;
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            return mean;
        } catch (error) {
            throw logError('calculateMean', error, { userId });
        }
    }

    static async calculateStandardDeviation(values, mean, userId) {
        try {
            if (!values.length) return 0;
            const squareDiffs = values.map(value => Math.pow(value - mean, 2));
            const stdDev = Math.sqrt(squareDiffs.reduce((sum, diff) => sum + diff, 0) / values.length);
            return stdDev;
        } catch (error) {
            throw logError('calculateStandardDeviation', error, { userId });
        }
    }

    static async getUserCgmData(userId, startOfDayTimestamp, endOfDayTimestamp) {
        try {
            const data = await cgmModel.find({ userId });
            if (!data.length) return null;
            
            const graph = data[0].sensorData;
            const graphOfDay = await this.filterGraphData(graph, startOfDayTimestamp, endOfDayTimestamp, userId);
            const graphOfPrevDay = await this.filterGraphData(graph, startOfDayTimestamp - 86400000, startOfDayTimestamp, userId);
            
            const calData = await this.cgmCalculation(graphOfDay, 1, userId);
            const calPrevData = await this.cgmCalculation(graphOfPrevDay, 0, userId);
            
            return {
                calData,
                calPrevData,
                graphOfDay
            };
        } catch (error) {
            throw logError('getUserCgmData', error, { userId });
        }
    }

    static async filterGraphData(graph, startDate, endDate, userId) {
        try {
            const filteredData = Object.entries(graph).reduce((acc, [key, value]) => {
                if (key >= startDate && key < endDate) acc[key] = value;
                return acc;
            }, {});
            return filteredData;
        } catch (error) {
            throw logError('filterGraphData', error, { userId });
        }
    }

    static async storeCalculatedData(cgmCalculatedDataModel, userId, date, calData, calPrevData, graphOfDay) {
        try {
            const updateData = {
                metabolicScore: calData.metabolic_score,
                prevDayMetabolicScoreDiff: calPrevData.metabolic_score,
                glucoseVariability: calData.glucoseVariability,
                avgGlucose: calData.avg_blood_glucose,
                timeInTarget: calData.time_in_range,
                hyperGlyceria: calData.hyper_glyceria,
                hypoGlyceria: calData.hypo_glyceria,
                hypo_glyceria_time: calData.hypo_glyceria_time,
                hyper_glyceria_time: calData.hyper_glyceria_time,
                focus: calData.focus_vector,
                athletic: calData.athletic,
                longevity: calData.longevity_factor,
                spikeBeans: calData.spikeBeans,
                crashBeans: calData.crashBeans,
                circadian_factor: calData.circadian_factor,
                cgm_data_count: Object.keys(graphOfDay).length,
                graph: graphOfDay,
                events: calData.event,
                unknown_events_detected: calData.unknown_events_detected,
                glucoseRush: calData.glucose_rush,
                glucoseDrops: calData.glucose_drops,
                percentage_in_target: calData.percentage_in_target,
                time_in_target_score: calData.time_in_target_score,
                avg_glucose_score: calData.avg_glucose_score,
                glucose_variability_score: calData.glucose_variability_score,
                glucose_variability_per: calData.glucose_variability_per
            };

            return await cgmCalculatedDataModel.findOneAndUpdate(
                { userId, date },
                updateData,
                { new: true, upsert: true }
            );
        } catch (error) {
            throw logError('storeCalculatedData', error, { userId });
        }
    }

    static async getEmptyData(userId, date) {
        try {
            return {
                userId,
                date: date.toString(),
                metabolicScore: -1,
                prevDayMetabolicScoreDiff: -1,
                glucoseVariability: -1,
                avgGlucose: -1,
                timeInTarget: -1,
                hyperGlyceria: -1,
                hypoGlyceria: -1,
                hypo_glyceria_time: -1,
                hyper_glyceria_time: -1,
                focus: -1,
                athletic: -1,
                longevity: -1,
                spikeBeans: {},
                crashBeans: {},
                circadian_factor: -1,
                cgm_data_count: -1,
                graph: {},
                events: [],
                unknown_events_detected: [],
                glucoseRush: -1,
                glucoseDrops: -1,
                percentage_in_target: -1,
                time_in_target_score: -1,
                avg_glucose_score: -1,
                glucose_variability_score: -1,
                glucose_variability_per: -1
            };
        } catch (error) {
            throw logError('getEmptyData', error, { userId });
        }
    }

    static async cgmCalculation(dataUnsort, currentDay, userId) {
        try {
            const data = Object.keys(dataUnsort)
                .sort()
                .reduce((obj, key) => {
                    obj[key] = dataUnsort[key];
                    return obj;
                }, {});

            let glucoseVariability = 0,
                time_in_range = 0,
                avg_blood_glucose = 0,
                hba1c = 0,
                glucose_rush = 0,
                glucose_drops = 0,
                metabolic_score = 0,
                event = [],
                longevity_factor = 0,
                focus_vector = 0,
                glucose_levels = {},
                hyper_glyceria = 0,
                hypo_glyceria = 0,
                spikeBeans = {},
                crashBeans = {},
                circadian_factor = 0,
                percentage_in_target = 0,
                avg_glucose_score = 0,
                glucose_variability_score = 0,
                athletic = 0;

            glucose_levels = Object.values(data);
            let times = Object.keys(data);

            let SD = stats.stdev(glucose_levels);
            glucoseVariability = SD;

            time_in_range = await this.timeInRange(glucose_levels, 110, 70, userId);
            hyper_glyceria = await this.hyperGlyceria(glucose_levels, 110, userId);
            hypo_glyceria = await this.hypoGlyceria(glucose_levels, 70, userId);
            avg_blood_glucose = await this.calculate_avg_blood_glucose(glucose_levels, userId);
            hba1c = (avg_blood_glucose + 46.7) / 28.7;
            glucose_rush = await this.calculate_glucose_rush(glucose_levels, userId);
            glucose_drops = await this.calculate_glucose_drops(glucose_levels, times, userId);

            let peakValue = await this.calculate_peak_value(data, userId);
            let valleyValue = await this.calculate_valley_value(data, userId);

            let criteria = [
                await this.circadian_rhythm(data, userId),
                glucoseVariability,
                peakValue.length
            ];

            let weights = [0.5, 0.3, 0.2];
            circadian_factor = Number(await this.circadian_rhythm(data, userId)).toFixed(2);
            longevity_factor = await this.calc_longevity_factor(criteria, weights, userId);

            let peakFValue = this.calculate_f_peak_value(data, userId);
            let valleyFValue = await this.calculate_f_valley_value(data, userId);

            focus_vector = await this.calc_focus_vector(peakFValue, valleyFValue, longevity_factor, userId);
            athletic = await this.calc_athletic_vector(time_in_range, times, userId);

            spikeBeans = await this.calc_no_of_peaks_or_valley_in_beans(peakFValue, userId);
            crashBeans = await this.calc_no_of_peaks_or_valley_in_beans(valleyFValue, userId);

            metabolic_score = await this.calculate_metabolic_score(
                glucoseVariability,
                time_in_range,
                avg_blood_glucose,
                times,
                focus_vector,
                userId
            );

            if (peakValue) {
                peakValue.forEach((element) => {
                    event.push(element);
                });
            }
            if (valleyValue) {
                valleyValue.forEach((element) => {
                    event.push(element);
                });
            }
            if (!glucoseVariability) {
                glucoseVariability = -1;
            }

            let unknown_events_detected = [];
            let all_unknown_events_detected = [];
            const max = await this.findMaxima(glucose_levels, avg_blood_glucose, userId);

            if (max.risePosition) {
                max.risePosition.forEach((rise) => {
                    let shouldSkip = false;
                    times
                        .slice()
                        .reverse()
                        .forEach((time) => {
                            if (shouldSkip) {
                                return;
                            }
                            if (times[rise] - time > 900000) {
                                all_unknown_events_detected.push(time);
                                shouldSkip = true;
                                return;
                            }
                        });
                });
            }

            if (all_unknown_events_detected.length > 0) {
                let temp = all_unknown_events_detected[0];
                unknown_events_detected.push({timeStamp: temp, value: data[temp]});
                for (let i = 0; i < all_unknown_events_detected.length - 1; i++) {
                    if (all_unknown_events_detected[i] - temp >= 7200000) {
                        unknown_events_detected.push({
                            timeStamp: all_unknown_events_detected[i],
                            value: data[all_unknown_events_detected[i]],
                        });
                        temp = all_unknown_events_detected[i];
                    }
                }
            } else {
                unknown_events_detected = all_unknown_events_detected;
            }

            percentage_in_target = await this.calculate_time_in_target_percentage(data, userId);
            avg_glucose_score = await this.calculate_average_glucose_score(data, userId);
            glucose_variability_score = await this.calculate_glucose_variability_score(data, userId);

            return {
                glucoseVariability: Math.round(glucoseVariability),
                time_in_range: Math.round(time_in_range),
                hypo_glyceria: Math.round(hypo_glyceria.count),
                hypo_glyceria_time: Math.round(hypo_glyceria.time),
                hyper_glyceria: Math.round(hyper_glyceria.count),
                hyper_glyceria_time: Math.round(hyper_glyceria.time),
                avg_blood_glucose: Math.round(avg_blood_glucose),
                hba1c: Math.round(hba1c),
                glucose_rush: Math.round(glucose_rush),
                glucose_drops: Math.round(glucose_drops),
                metabolic_score: Math.round(metabolic_score),
                event: event,
                unknown_events_detected: unknown_events_detected,
                longevity_factor: Math.round(longevity_factor),
                focus_vector: Math.round(focus_vector),
                athletic: Math.round(athletic),
                spikeBeans: spikeBeans,
                crashBeans: crashBeans,
                circadian_factor: circadian_factor,
                percentage_in_target: percentage_in_target.percentage_in_target,
                time_in_target_score: percentage_in_target.time_in_target_score,
                avg_glucose_score: avg_glucose_score,
                glucose_variability_score: glucose_variability_score.glucose_variability_score,
                glucose_variability_per: glucose_variability_score.glucose_variability_per
            };
        } catch (error) {
            throw logError('cgmCalculation', error, { userId });
        }
    }

    static async agp(bean, key, userId) {
        try {
            return {
                key: key,
                median: stats.median(bean),
                tenPer: stats.percentile(bean, 0.1),
                twentyFivePer: stats.percentile(bean, 0.25),
                seventyFivePer: stats.percentile(bean, 0.75),
                nintyFivePer: stats.percentile(bean, 0.9),
            };
        } catch (error) {
            throw logError('agp', error, { userId });
        }
    }

    static async hyperGlyceria(glucose_levels, highRange, userId) {
        try {
            let count = 0;
            let time = 0;
            glucose_levels.forEach((element) => {
                if (Number(element) > highRange) count++;
            });
            time = count * 15;
            return { count, time };
        } catch (error) {
            throw logError('hyperGlyceria', error, { userId });
        }
    }

    static async hypoGlyceria(glucose_levels, lowRange, userId) {
        try {
            let count = 0;
            let time = 0;
            glucose_levels.forEach((element) => {
                if (Number(element) < lowRange) count++;
            });
            time = count * 15;
            return { count, time };
        } catch (error) {
            throw logError('hypoGlyceria', error, { userId });
        }
    }

    static async timeInRange(glucose_levels, highRange, lowRange, userId) {
        try {
            let count = 0;
            glucose_levels.forEach((element) => {
                if (Number(element) < highRange && Number(element) > lowRange) count++;
            });
            count = count * 5;
            return count;
        } catch (error) {
            throw logError('timeInRange', error, { userId });
        }
    }

    static async calculate_glucose_rush(glucose_levels, userId) {
        try {
            let max_rush_duration = 0;
            let current_rush_duration = 0;
            glucose_levels.forEach((element) => {
                if (Number(element) > 140 && Number(element++) > 140) {
                    current_rush_duration += 1;
                } else {
                    max_rush_duration = max_rush_duration > current_rush_duration
                        ? max_rush_duration
                        : current_rush_duration;
                    current_rush_duration = 0;
                }
            });
            return max_rush_duration;
        } catch (error) {
            throw logError('calculate_glucose_rush', error, { userId });
        }
    }

    static async calculate_avg_blood_glucose(glucose_levels, userId) {
        try {
            let sum_blood_glucose = stats.sum(glucose_levels);
            let n = glucose_levels.length;
            let avg_blood_glucose = sum_blood_glucose / n;
            return avg_blood_glucose || -1;
        } catch (error) {
            throw logError('calculate_avg_blood_glucose', error, { userId });
        }
    }

    static async calculate_glucose_drops(glucose_levels, times, userId) {
        try {
            let count = 0;
            for (let i = 0; i < glucose_levels.length; i++) {
                if (Number(glucose_levels[i]) - Number(glucose_levels[i - 1]) < -10) {
                    if (times[i] - times[i - 1] <= 5) {
                        count += 1;
                    }
                }
            }
            return count;
        } catch (error) {
            throw logError('calculate_glucose_drops', error, { userId });
        }
    }

    static async calculate_metabolic_score(glucose_variability, time_in_range, avg_blood_glucose, times, focus_vector, userId) {
        try {
            let tLength = times.length;
            let GVI = 0, AGI = 0, TITI = 0;
            
            if (glucose_variability < 12) {
                GVI = 1;
            } else {
                GVI = 1 - glucose_variability / 100;
            }

            if (avg_blood_glucose > 68 && avg_blood_glucose < 114) {
                AGI = 1;
            } else if (avg_blood_glucose > 114) {
                AGI = 1 - (avg_blood_glucose - 114) / 114;
            } else if (avg_blood_glucose < 68) {
                AGI = 1 - (68 - avg_blood_glucose) / 68;
            }

            TITI = time_in_range / 15 / tLength;

            let metabolic_score = GVI * 23 + AGI * 23 + TITI * 27 + focus_vector * 1.8;
            return metabolic_score || -1;
        } catch (error) {
            throw logError('calculate_metabolic_score', error, { userId });
        }
    }

    static async circadian_rhythm(graph, userId) {
        try {
            let times = Object.keys(graph);
            let glucose_levels = Object.values(graph);
            let day_mean_array = [];
            let day_sum = 0;
            let day_mean = 0;

            times.forEach((element) => {
                let timebreak = new Date(Number(element));
                let hr = timebreak.getHours();
                if (hr >= 7 && hr < 16) {
                    day_mean_array.push(times.indexOf(element));
                }
            });

            day_mean_array.forEach((element) => {
                day_sum = day_sum + Number(glucose_levels[element]);
            });

            day_mean = day_sum / day_mean_array.length;

            let night_mean_array = [];
            let night_sum = 0;
            let night_mean = 0;

            times.forEach((element) => {
                let timebreak = new Date(Number(element));
                let hr = timebreak.getHours();
                if (hr < 7 && hr <= 16) {
                    night_mean_array.push(times.indexOf(element));
                }
            });

            night_mean_array.forEach((element) => {
                night_sum = night_sum + Number(glucose_levels[element]);
            });

            night_mean = night_sum / night_mean_array.length;

            if (!day_mean) day_mean = 80;
            if (!night_mean) night_mean = 90;
            
            let circadian_factor = Math.abs(day_mean - night_mean) / day_mean;
            return circadian_factor;
        } catch (error) {
            throw logError('circadian_rhythm', error, { userId });
        }
    }

    static async calculate_glucose_variability(data, userId) {
        try {
            let time = Object.keys(data);
            let glucose_levels = Object.values(data);
            let SD = stats.stdev(glucose_levels);
            let meanGlucose = stats.mean(glucose_levels);
            let glucoseVariabilityPer = (SD / meanGlucose) * 100;

            if (glucoseVariabilityPer) {
                if (glucoseVariabilityPer < 12) {
                    return {
                        type: "glucose_variability_per",
                        timeStamp: time[0],
                        value: glucoseVariabilityPer,
                        discription: `${glucoseVariabilityPer.toFixed(2)} ml/dL, Glucose Variability within the standard value of 12%`
                    };
                } else {
                    return {
                        type: "glucose_variability_per",
                        timeStamp: time[0],
                        value: glucoseVariabilityPer,
                        discription: `${glucoseVariabilityPer.toFixed(2)} ml/dL, Glucose Variability went above the standard value of 12%`
                    };
                }
            }
            return 0;
        } catch (error) {
            throw logError('calculate_glucose_variability', error, { userId });
        }
    }

    static async calculate_f_peak_value(data, userId) {
        try {
            let graph_keys = Object.keys(data);
            let graph_valuesString = Object.values(data);
            let graph_values = [];
            graph_valuesString.forEach((element) => {
                graph_values.push(Number(element));
            });

            let peak_index = [];
            for (let i = 1; i < graph_values.length - 1; i++) {
                if (graph_values[i] > 110) {
                    if (
                        graph_values[i - 1] < graph_values[i] &&
                        graph_values[i] > graph_values[i + 1]
                    ) {
                        peak_index.push(i);
                    }
                }
            }
            let events = [];
            peak_index.forEach((element) => {
                let data = {
                    type: "peak_detection",
                    timeStamp: graph_keys[element],
                    value: graph_values[element],
                    discription: "Peak Detection",
                };
                events.push(data);
            });
            return events;
        } catch (error) {
            throw logError('calculate_f_peak_value', error, { userId });
        }
    }

    static async calculate_peak_value(data, userId) {
        try {
            let graph_keys = Object.keys(data);
            let graph_valuesString = Object.values(data);
            let graph_values = [];
            graph_valuesString.forEach((element) => {
                graph_values.push(Number(element));
            });

            let peak_index = [];
            for (let i = 1; i < graph_values.length - 1; i++) {
                if (graph_values[i] > 120 && graph_values[i] < 140) {
                    if (
                        graph_values[i - 1] < graph_values[i] &&
                        graph_values[i] > graph_values[i + 1]
                    ) {
                        peak_index.push(i);
                    }
                }
            }
            let events = [];
            peak_index.forEach((element) => {
                let data = {
                    type: "hyper_glycemia",
                    timeStamp: graph_keys[element],
                    value: graph_values[element],
                    discription: `${graph_values[element]} mg/dL, Hyperglycemic event detected as your glucose level was higher than 120 mg/dL`,
                };
                events.push(data);
            });

            function removeElementsLessThanThree(array) {
                for (var i = 1; i < array.length - 1; i++) {
                    if (Math.abs(array[i].timeStamp - array[i - 1].timeStamp) < 900000) {
                        array.splice(i, 1);
                        i--;
                    }
                }
                return array;
            }

            removeElementsLessThanThree(events);

            let rush_index = [];
            for (let i = 1; i < graph_values.length - 1; i++) {
                if (graph_values[i] > 140) {
                    if (
                        graph_values[i - 1] < graph_values[i] &&
                        graph_values[i] > graph_values[i + 1]
                    ) {
                        rush_index.push(i);
                    }
                }
            }
            rush_index.forEach((element) => {
                let data = {
                    type: "glucose_rush",
                    timeStamp: graph_keys[element],
                    value: graph_values[element],
                    discription: `${graph_values[element]} mg/dL, Glucose Rush event detected as your glucose level was higher than 140 mg/dL`,
                };
                events.push(data);
            });
            return events;
        } catch (error) {
            throw logError('calculate_peak_value', error, { userId });
        }
    }

    static async calculate_f_valley_value(data, userId) {
        try {
            let graph_keys = Object.keys(data);
            let graph_valuesString = Object.values(data);
            let graph_values = [];
            graph_valuesString.forEach((element) => {
                graph_values.push(Number(element));
            });

            let peak_index = [];
            for (let i = 1; i < graph_values.length - 1; i++) {
                if (graph_values[i] < 71) {
                    if (
                        graph_values[i - 1] > graph_values[i] &&
                        graph_values[i] < graph_values[i + 1]
                    ) {
                        peak_index.push(i);
                    }
                }
            }
            let events = [];
            peak_index.forEach((element) => {
                let data = {
                    type: "valley_detection",
                    timeStamp: graph_keys[element],
                    value: graph_values[element],
                    discription: "Valley Detection",
                };
                events.push(data);
            });
            return events;
        } catch (error) {
            throw logError('calculate_f_valley_value', error, { userId });
        }
    }

    static async calculate_valley_value(data, userId) {
        try {
            let graph_keys = Object.keys(data);
            let graph_valuesString = Object.values(data);
            let graph_values = [];
            graph_valuesString.forEach((element) => {
                graph_values.push(Number(element));
            });

            let peak_index = [];
            for (let i = 1; i < graph_values.length - 1; i++) {
                if (graph_values[i] < 54) {
                    if (
                        graph_values[i - 1] > graph_values[i] &&
                        graph_values[i] < graph_values[i + 1]
                    ) {
                        peak_index.push(i);
                    }
                }
            }
            let events = [];
            peak_index.forEach((element) => {
                let data = {
                    type: "glucose_crash",
                    timeStamp: graph_keys[element],
                    value: graph_values[element],
                    discription: `${graph_values[element]} mg/dL, Glucose Crash event detected as your glucose level went below 54 mg/dL`,
                };
                events.push(data);
            });

            let rush_index = [];
            for (let i = 1; i < graph_values.length - 1; i++) {
                if (graph_values[i] < 70 && graph_values[i] > 54) {
                    if (
                        graph_values[i - 1] > graph_values[i] &&
                        graph_values[i] < graph_values[i + 1]
                    ) {
                        rush_index.push(i);
                    }
                }
            }

            rush_index.forEach((element) => {
                let data = {
                    type: "hypo_glycemia",
                    timeStamp: graph_keys[element],
                    value: graph_values[element],
                    discription: `${graph_values[element]} mg/dL, Hypoglycemic Event detected as your glucose level went below 70 mg/dL`,
                };
                events.push(data);
            });
            return events;
        } catch (error) {
            throw logError('calculate_valley_value', error, { userId });
        }
    }

    static async calculate_avg_glucose_score(data, userId) {
        try {
            let time = Object.keys(data);
            let graph_valuesString = Object.values(data);
            let avgGlucose = stats.mean(graph_valuesString);

            if (68 < avgGlucose && avgGlucose < 114) {
                let data = {
                    type: "avg_glucose",
                    timeStamp: time[0],
                    value: avgGlucose,
                    discription: "This is a good or normal range of HbA1c"
                };
                return data;
            }
            if (117 < avgGlucose && avgGlucose < 137) {
                let data = {
                    type: "avg_glucose",
                    timeStamp: time[0],
                    value: avgGlucose,
                    discription: "This may be indicative of pre-diabetes and you may have a higher chance of getting diabetes. Consult a doctor if your HbA1c is in this range"
                };
                return data;
            }
            if (137 < avgGlucose) {
                let data = {
                    type: "avg_glucose",
                    timeStamp: time[time.length - 1],
                    value: avgGlucose,
                    discription: "This is indicative of diabetes. Consult a doctor if your HbA1c is in this range"
                };
                return data;
            }
        } catch (error) {
            throw logError('calculate_avg_glucose_score', error, { userId });
        }
    }

    static async calc_longevity_factor(criteria, weights, userId) {
        try {
            let score = 0;
            for (let i = 0; i < criteria.length; i++) {
                score += criteria[i] * weights[i];
            }
            return score || -1;
        } catch (error) {
            throw logError('calc_longevity_factor', error, { userId });
        }
    }

    static async get_peak_hours(events, userId) {
        try {
            let time = [];
            const e = await events;
            e.forEach((element) => {
                time.push(Number(element.timeStamp));
            });
            let hour = [];
            time.forEach((element) => {
                const data = new Date(element);
                hour.push(data.getHours());
            });
            return hour;
        } catch (error) {
            throw logError('get_peak_hours', error, { userId });
        }
    }

    static async calc_no_of_peaks_or_valley_in_beans(events, userId) {
        try {
            let peak_hours = await this.get_peak_hours(events, userId);

            var score = 0,
                score1 = 0,
                score2 = 0,
                score3 = 0,
                score4 = 0,
                score5 = 0,
                score6 = 0,
                score7 = 0;

            peak_hours.forEach((element) => {
                if (element >= 8 && element < 10) score1 += 1;
                if (element >= 10 && element < 12) score2 += 1;
                if (element >= 12 && element < 14) score3 += 1;
                if (element >= 14 && element < 16) score4 += 1;
                if (element >= 16 && element < 18) score5 += 1;
                if (element >= 18 && element < 20) score6 += 1;
                if (element >= 20 && element < 22) score7 += 1;
            });

            return {
                bet8to10: score1,
                bet10to12: score2,
                bet12to14: score3,
                bet14to16: score4,
                bet16to18: score5,
                bet18to20: score6,
                bet20to22: score7
            };
        } catch (error) {
            throw logError('calc_no_of_peaks_or_valley_in_beans', error, { userId });
        }
    }

    static async calc_focus_vector_seperately(events, userId) {
        try {
            let peak_hours = await this.get_peak_hours(events, userId);

            var score = 0,
                score1 = 0,
                score2 = 0,
                score3 = 0,
                score4 = 0,
                score5 = 0,
                score6 = 0,
                score7 = 0;

            peak_hours.forEach((element) => {
                if (element >= 8 && element < 10) score1 += 10;
                if (element >= 10 && element < 12) score2 += 10;
                if (element >= 12 && element < 14) score3 += 10;
                if (element >= 14 && element < 16) score4 += 10;
                if (element >= 16 && element < 18) score5 += 10;
                if (element >= 18 && element < 20) score6 += 10;
                if (element >= 20 && element < 22) score7 += 10;
            });

            score = (score1 + score2 + score3 + score4 + score5 + score6 + score7) / 7;
            return score;
        } catch (error) {
            throw logError('calc_focus_vector_seperately', error, { userId });
        }
    }

    static async calc_focus_vector(peakValue, valleyValue, longevity_factor, userId) {
        try {
            let focus_vector_peak = await this.calc_focus_vector_seperately(peakValue, userId);
            let focus_vector_valley = await this.calc_focus_vector_seperately(valleyValue, userId);
            let focus_vector = (focus_vector_peak + focus_vector_valley) / 2;

            if (longevity_factor == -1) return -1;
            if (focus_vector >= 0 && focus_vector <= 10) return 10 - focus_vector;
            if (focus_vector < 0) return 0;
            return 10;
        } catch (error) {
            throw logError('calc_focus_vector', error, { userId });
        }
    }

    static async calc_athletic_vector(time_in_range, times, userId) {
        try {
            let tLength = times.length;
            if (time_in_range == 0 || tLength == 0) return 0;
            
            let athletic = (Number(time_in_range / 15) / tLength) * 10;
            return athletic || -1;
        } catch (error) {
            throw logError('calc_athletic_vector', error, { userId });
        }
    }

    static async findMaxima(arr = [], avg_blood_glucose, userId) {
        try {
            let positions = [];
            let maximas = [];
            let risePosition = [];
            let rise = [];

            for (let i = 1; i < arr.length - 1; i++) {
                if (arr[i] > arr[i - 1] && arr[i] > avg_blood_glucose) {
                    if (arr[i] > arr[i + 1]) {
                        if (arr[i] > 120) {
                            positions.push(i);
                            maximas.push(arr[i]);
                        }
                    } else if (arr[i] === arr[i + 1]) {
                        let temp = i;
                        while (arr[i] === arr[temp]) i++;
                        if (arr[temp] > arr[i]) {
                            if (arr[i] > 120) {
                                positions.push(temp);
                                maximas.push(arr[temp]);
                            }
                        }
                    }
                }
            }

            positions.forEach((peakIndex) => {
                for (let i = peakIndex; i > 0; i--) {
                    if (arr[i] <= arr[i - 1]) {
                        risePosition.push(i);
                        rise.push(arr[i]);
                        break;
                    }
                }
            });

            return { maximas, positions, risePosition, rise };
        } catch (error) {
            throw logError('findMaxima', error, { userId });
        }
    }

    static async calculate_time_in_target_percentage(graph, userId) {
        try {
            let glucoseData = Object.values(graph);
            let time_in_range = await this.timeInRange(glucoseData, 110, 70, userId);
            let percentage_in_target = 0;
            let time_in_target_score = 0;
            
            if (glucoseData.length > 0) {
                percentage_in_target = (time_in_range / (glucoseData.length * 5)) * 100;
                time_in_target_score = 100 * (percentage_in_target / 70);
            } else {
                percentage_in_target = -1;
                time_in_target_score = -1;
            }

            return {
                percentage_in_target: Number(percentage_in_target.toFixed(2)),
                time_in_target_score: Number(time_in_target_score.toFixed(2))
            };
        } catch (error) {
            throw logError('calculate_time_in_target_percentage', error, { userId });
        }
    }

    static async calculate_glucose_variability_score(graph, userId) {
        try {
            const glucoseData = Object.values(graph);
            let glucose_variability_score = 0;
            let glucose_variability_per = 0;

            let mean_glucose = stats.mean(glucoseData);
            let std_dev = stats.stdev(glucoseData);
            let coefficient_variation = std_dev / mean_glucose;
            
            if (glucoseData.length > 0) {
                glucose_variability_score = 100 * (1 - coefficient_variation);
                glucose_variability_per = coefficient_variation * 100;
            } else {
                glucose_variability_score = -1;
                glucose_variability_per = -1;
            }

            return {
                glucose_variability_score: Number(glucose_variability_score.toFixed(2)),
                glucose_variability_per: Number(glucose_variability_per.toFixed(2))
            };
        } catch (error) {
            throw logError('calculate_glucose_variability_score', error, { userId });
        }
    }

    static generateRandomCgmDeviceId(deviceId_Length) {
        try {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < deviceId_Length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
        } catch (error) {
            throw logError('generateRandomCgmDeviceId', error);
        }
    }

    static async getDateRangeGlucoseReadings(userId, startDate, endDate) {
        // Set time range
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const startTimestamp = start.getTime();
    
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const endTimestamp = end.getTime();
    
        // Get all readings within date range
        const cgmDocuments = await cgmModel.find({
            userId
        }).sort({ createdAt: 1 }).select('-sensor_id');
    
        // Process readings by day
        const dailyReadings = {};
        const fullDailyReadings = {}; // Store all readings for statistics
        let latestReadings = 0;
        let totalReadingsCount = 0;
        
        // Track glucose ranges
        let highestGlucose = {
            value: 0,
            timestamp: new Date().toISOString() // Default to current timestamp
        };
        let lowestGlucose = {
            value: 0, // Change from Infinity to 0 as default
            timestamp: new Date().toISOString() // Default to current timestamp
        };
        let normalRangeReadings = []; // Array to store normal range readings with timestamps
    
        for (const doc of cgmDocuments) {
            Object.entries(doc.sensorData).forEach(([timestamp, value]) => {
                const timestampNum = parseInt(timestamp);
                const glucoseValue = parseFloat(value);
                const readingTimestamp = new Date(timestampNum).toISOString();
                
                if (timestampNum >= startTimestamp && timestampNum <= endTimestamp) {
                    const dateKey = new Date(timestampNum).toISOString().split('T')[0];
                    
                    // Initialize arrays for both full and sampled readings
                    if (!fullDailyReadings[dateKey]) {
                        fullDailyReadings[dateKey] = [];
                    }
                    if (!dailyReadings[dateKey]) {
                        dailyReadings[dateKey] = [];
                    }
    
                    // Store reading in full readings array
                    fullDailyReadings[dateKey].push({
                        timestamp: readingTimestamp,
                        value: glucoseValue,
                        sensor_id: doc.sensor_id
                    });
                    
                    // Track highest glucose
                    if (glucoseValue > highestGlucose.value) {
                        highestGlucose = {
                            value: glucoseValue,
                            timestamp: readingTimestamp
                        };
                    }
    
                    // Track lowest glucose - Only update if we have real readings
                    // and if the current lowest is 0 (default) or the new value is lower
                    if (glucoseValue > 0 && (lowestGlucose.value === 0 || glucoseValue < lowestGlucose.value)) {
                        lowestGlucose = {
                            value: glucoseValue,
                            timestamp: readingTimestamp
                        };
                    }
    
                    // Track normal range readings with timestamps
                    if (glucoseValue >= 70 && glucoseValue <= 180) {
                        normalRangeReadings.push({
                            value: glucoseValue,
                            timestamp: readingTimestamp
                        });
                    }
    
                    totalReadingsCount++;
                }
            });
    
            if(doc.latestReading && doc.latestReading.value > latestReadings) {
                latestReadings = doc.latestReading.value;
            }
        }
    
        // Sample 10 evenly distributed readings for each day
        Object.entries(fullDailyReadings).forEach(([date, readings]) => {
            const sortedReadings = readings.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
    
            if (sortedReadings.length <= 10) {
                dailyReadings[date] = sortedReadings;
            } else {
                // Calculate step size for even distribution
                const step = Math.floor(sortedReadings.length / 10);
                const sampledReadings = [];
    
                // Always include first and last reading
                sampledReadings.push(sortedReadings[0]);
    
                // Add 8 evenly distributed readings
                for (let i = 1; i < 9; i++) {
                    const index = i * step;
                    sampledReadings.push(sortedReadings[index]);
                }
    
                // Add last reading
                sampledReadings.push(sortedReadings[sortedReadings.length - 1]);
    
                dailyReadings[date] = sampledReadings;
            }
        });
    
        // Calculate statistics for each day
        const results = Object.entries(dailyReadings).map(([date, readings]) => ({
            date,
            totalReadings: fullDailyReadings[date].length, // Use full count for totalReadings
            readings: readings // Use sampled readings for display
        }));
    
        // Sort normal range readings by timestamp
        normalRangeReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
        // Calculate percentage and average of normal range readings
        const normalRangePercentage = totalReadingsCount > 0 
            ? ((normalRangeReadings.length / totalReadingsCount) * 100).toFixed(2)
            : 0;
            
        // Calculate average of normal range readings
        const normalRangeAverage = normalRangeReadings.length > 0
            ? (normalRangeReadings.reduce((sum, reading) => sum + reading.value, 0) / normalRangeReadings.length).toFixed(2)
            : 0;
            
        // Get latest normal range reading timestamp
        const latestNormalRangeTimestamp = normalRangeReadings.length > 0
            ? normalRangeReadings[normalRangeReadings.length - 1].timestamp
            : new Date().toISOString(); // Default to current timestamp
    
        // Ensure valid values for highest and lowest
        if (highestGlucose.value === 0) {
            highestGlucose.value = latestReadings || 0;
        }
        
        if (lowestGlucose.value === 0 && totalReadingsCount > 0) {
            // If we have readings but lowest is still 0, use a reasonable default
            // or the average or any non-zero value from the readings
            let defaultLow = 70; // Basic default for low glucose
            if (normalRangeAverage > 0) {
                defaultLow = parseFloat(normalRangeAverage);
            } else if (highestGlucose.value > 0) {
                defaultLow = Math.max(70, highestGlucose.value * 0.7); // 70% of highest as a fallback
            }
            
            lowestGlucose.value = defaultLow;
        }
    
        return { 
            latestReadings,
            results,
            totalReadings: totalReadingsCount,
            dateRange: {
                startDate: startDate,
                endDate: endDate
            },
            glucoseStats: {
                highest: {
                    value: highestGlucose.value,
                    timestamp: highestGlucose.timestamp
                },
                lowest: {
                    value: lowestGlucose.value,
                    timestamp: lowestGlucose.timestamp
                },
                normalRange: {
                    count: normalRangeReadings.length,
                    percentage: parseFloat(normalRangePercentage),
                    average: parseFloat(normalRangeAverage),
                    latestTimestamp: latestNormalRangeTimestamp
                }
            }
        };
    }

    static async getLatestCgmReadingData(userId) {
        try {
            const cgmData = await cgmCalculatedDataModel.findOne({ userId })
                .sort({ date: -1 })
                .select('metabolicScore avgGlucose timeInTarget');
            return cgmData;
        } catch (error) {
            throw logError('getCgmData', error, { userId });
        }
    }

    static async getCgmData(userId, date) {
        try {
            const currdate = date;
            
            if (!userId || !currdate) {
                throw new Error(!userId ? "Please Enter User ID" : "Please Enter Valid Date");
            }

            const newdate = Number(currdate);
            const currDate = new Date(newdate);

            const startOfDay = new Date(currDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(currDate);
            endOfDay.setHours(23, 59, 59, 999);normalRangeReadings

            const startOfDayTimestamp = startOfDay.getTime();
            const endOfDayTimestamp = endOfDay.getTime();
            
            const cgmData = await this.getUserCgmData(userId, startOfDayTimestamp, endOfDayTimestamp);
            
            if (!cgmData) {
                return await this.getEmptyData(userId, date);
            }

            return cgmData;
        } catch (error) {
            throw logError('getCgmData', error, { userId });
        }
    }

    static async saveCgmCalculations(cgmData, userId, date) {
        try {
            const { calData, calPrevData, graphOfDay } = cgmData;
            
            const calculated = await new cgmCalculatedDataModel({
                userId: userId,
                date: date,
                metabolicScore: calData.metabolic_score,
                prevDayMetabolicScoreDiff: calPrevData.metabolic_score,
                glucoseVariability: calData.glucoseVariability,
                avgGlucose: calData.avg_blood_glucose,
                timeInTarget: calData.time_in_range,
                hyperGlyceria: calData.hyper_glyceria,
                hypoGlyceria: calData.hypo_glyceria,
                hypo_glyceria_time: calData.hypo_glyceria_time,
                hyper_glyceria_time: calData.hyper_glyceria_time,
                focus: calData.focus_vector,
                athletic: calData.athletic,
                longevity: calData.longevity_factor,
                spikeBeans: calData.spikeBeans,
                crashBeans: calData.crashBeans,
                circadian_factor: calData.circadian_factor,
                cgm_data_count: Object.keys(graphOfDay).length,
                graph: graphOfDay,
                events: calData.event,
                unknown_events_detected: calData.unknown_events_detected,
                glucoseRush: calData.glucose_rush,
                glucoseDrops: calData.glucose_drops,
                percentage_in_target: calData.percentage_in_target,
                time_in_target_score: calData.time_in_target_score,
                avg_glucose_score: calData.avg_glucose_score,
                glucose_variability_score: calData.glucose_variability_score,
                glucose_variability_per: calData.glucose_variability_per,
            });
    
            await calculated.save();
            return calculated;
        } catch (error) {
            throw logError('saveCgmCalculations', error, { userId });
        }
    }
    static async getUserMetabolicScore(userId) {
        try {
            // Get the latest record for the user
            const latestRecord = await cgmCalculatedDataModel
                .findOne({ userId })
                .sort({ date: -1 })
                .select('metabolicScore prevDayMetabolicScoreDiff date')
                .lean();

            if (!latestRecord) {
                throw new Error('No metabolic score data found for the user');
            }

            // Calculate score difference
            const currentScore = latestRecord.metabolicScore;
            const scoreDifference = currentScore - (latestRecord.prevDayMetabolicScoreDiff || 0);

            // Prepare response data
            return {
                currentScore,
                scoreDifference,
                lastUpdated: latestRecord.date,
                trend: this.calculateTrend(scoreDifference)
            };

        } catch (error) {
            throw logError('getUserMetabolicScore', error, { userId });
        }
    }

    static calculateTrend(scoreDifference) {
        try {
            if (scoreDifference > 0) return 'improving';
            if (scoreDifference < 0) return 'declining';
            return 'stable';
        } catch (error) {
            throw logError('calculateTrend', error, { scoreDifference });
        }
    }

    static async calculate_average_glucose_score(graph) {
        const glucoseData = Object.values(graph);
    
        let glucose_sd = stats.stdev(glucoseData);
        let mean_glucose = stats.mean(glucoseData);
        let gvi = 0;
        let avg_glucose_score = 0;
    
        if (glucoseData.length > 0) {
            gvi = (glucose_sd / mean_glucose) * 100;
            avg_glucose_score = 100 - gvi;
        } else {
            gvi = -1;
            avg_glucose_score = -1;
        }
    
        return Number(avg_glucose_score.toFixed(2));
    }

    static async processCGMData(userId, glucoseReading, reading_time, user) {
        try {
            const {gender, height, date_of_birth, weight, name} = user;
            let cgm_data = await cgmModel.findOne({userId: userId});

            // Create or update CGM data
            if (cgm_data) {
                let updated_cgm_data = await cgmModel.findOneAndUpdate(
                    { userId: userId },
                    {
                      $set: {
                        [`sensorData.${reading_time}`]: glucoseReading
                      },
                      $inc: {
                        manualGlucoseReadingsCount: 1
                      }
                    },
                    { new: true }
                  );
                
                cgm_data = updated_cgm_data;
            } else {
                const cgmdata = await new cgmModel({
                    manualGlucoseReadingCount: 1,
                    userId: userId,
                    name: name,
                    gender: gender,
                    date_of_birth: date_of_birth,
                    height: height,
                    weight: weight,
                    sensor_id: this.generateRandomCgmDeviceId(11),
                    sensorData: {[`${reading_time}`]: glucoseReading},
                });
                cgm_data = cgmdata;
                const dataToSave = await cgmdata.save();
            }

            // Process sensor data
            const graph = {};
            for (const [timestamp, value] of Object.entries(cgm_data.sensorData)) {
                graph[timestamp] = value;
            }

            const data = Object.keys(graph)
                .sort()
                .reduce((obj, key) => {
                    obj[key] = graph[key];
                    return obj;
                }, {});

            // Initialize variables
            let glucoseVariability = 0,
                time_in_range = 0,
                avg_blood_glucose = 0,
                hba1c = 0,
                glucose_rush = 0,
                glucose_drops = 0,
                metabolic_score = 0,
                event = [],
                longevity_factor = 0,
                focus_vector = 0,
                glucose_levels = {},
                hyper_glyceria = 0,
                hypo_glyceria = 0,
                spikeBeans = {},
                crashBeans = {},
                circadian_factor = 0,
                percentage_in_target = 0,
                avg_glucose_score = 0,
                glucose_variability_score = 0,
                athletic = 0;

            // Calculate basic metrics
            glucose_levels = Object.values(data);
            let times = Object.keys(data);
            let SD = stats.stdev(glucose_levels);
            glucoseVariability = SD;

            // Calculate all metrics
            
            time_in_range = await this.timeInRange(glucose_levels, 110, 70, userId);
            hyper_glyceria = await this.hyperGlyceria(glucose_levels, 110, userId);
            hypo_glyceria = await this.hypoGlyceria(glucose_levels, 70, userId);
            avg_blood_glucose = await this.calculate_avg_blood_glucose(glucose_levels, userId);
            hba1c = (avg_blood_glucose + 46.7) / 28.7;
            glucose_rush = await this.calculate_glucose_rush(glucose_levels, userId);
            glucose_drops = await this.calculate_glucose_drops(glucose_levels, times, userId);

            let peakValue = await this.calculate_peak_value(data, userId);
            let valleyValue = await this.calculate_valley_value(data, userId);

            let criteria = [
                await this.circadian_rhythm(data, userId),
                glucoseVariability,
                peakValue.length,
            ];

            let weights = [0.5, 0.3, 0.2];
            circadian_factor = Number(await this.circadian_rhythm(data, userId)).toFixed(2);
            longevity_factor = await this.calc_longevity_factor(criteria, weights, userId);

            let peakFValue = await this.calculate_f_peak_value(data, userId);
            let valleyFValue = await this.calculate_f_valley_value(data, userId);

            focus_vector = await this.calc_focus_vector(
                peakFValue,
                valleyFValue,
                longevity_factor,
                userId
            );

            athletic = await this.calc_athletic_vector(time_in_range, times, userId);

            spikeBeans = await this.calc_no_of_peaks_or_valley_in_beans(peakFValue, userId);
            crashBeans = await this.calc_no_of_peaks_or_valley_in_beans(valleyFValue, userId);

            metabolic_score = await this.calculate_metabolic_score(
                glucoseVariability,
                time_in_range,
                avg_blood_glucose,
                times,
                focus_vector,
                userId
            );
        

            // Process events
            if (peakValue) {
                peakValue.forEach((element) => {
                    event.push(element);
                });
            }
            if (valleyValue) {
                valleyValue.forEach((element) => {
                    event.push(element);
                });
            }
            if (!glucoseVariability) {
                glucoseVariability = -1;
            }

            // Process unknown events
            let unknown_events_detected = [];
            let all_unknown_events_detected = [];
            const max = await this.findMaxima(glucose_levels, avg_blood_glucose, userId);

            if (max.risePosition) {
                max.risePosition.forEach((rise) => {
                    let shouldSkip = false;
                    times
                        .slice()
                        .reverse()
                        .forEach((time) => {
                            if (shouldSkip) {
                                return;
                            }
                            if (times[rise] - time > 900000) {
                                all_unknown_events_detected.push(time);
                                shouldSkip = true;
                                return;
                            }
                        });
                });
            }

            if (all_unknown_events_detected.length > 0) {
                let temp = all_unknown_events_detected[0];
                unknown_events_detected.push({timeStamp: temp, value: data[temp]});
                for (let i = 0; i < all_unknown_events_detected.length - 1; i++) {
                    if (all_unknown_events_detected[i] - temp >= 7200000) {
                        unknown_events_detected.push({
                            timeStamp: all_unknown_events_detected[i],
                            value: data[all_unknown_events_detected[i]],
                        });
                        temp = all_unknown_events_detected[i];
                    }
                }
            } else {
                unknown_events_detected = all_unknown_events_detected;
            }

            // Calculate final scores
            percentage_in_target = await this.calculate_time_in_target_percentage(data, userId);
            avg_glucose_score = await this.calculate_average_glucose_score(data, userId);
            glucose_variability_score = await this.calculate_glucose_variability_score(data, userId);

            // Prepare final data
            const newData = {
                glucoseVariability: Math.round(glucoseVariability),
                timeInTarget: Math.round(time_in_range),
                hypoGlyceria: Math.round(hypo_glyceria.count),
                hypoGlyceriaTime: Math.round(hypo_glyceria.time),
                hyperGlyceria: Math.round(hyper_glyceria.count),
                hyperGlyceriaTime: Math.round(hyper_glyceria.time),
                avgGlucose: Math.round(avg_blood_glucose),
                hba1c: Math.round(hba1c),
                glucoseRush: Math.round(glucose_rush),
                glucoseDrops: Math.round(glucose_drops),
                metabolicScore: Math.round(metabolic_score),
                events: event,
                unknownEventsDetected: unknown_events_detected,
                longevity: Math.round(longevity_factor),
                focus: Math.round(focus_vector),
                athletic: Math.round(athletic),
                spikeBeans: spikeBeans,
                crashBeans: crashBeans,
                circadianFactor: circadian_factor,
                percentageInTarget: percentage_in_target.percentage_in_target,
                timeInTargetScore: percentage_in_target.time_in_target_score,
                avgGlucoseScore: avg_glucose_score,
                glucoseVariabilityScore: glucose_variability_score.glucose_variability_score,
                glucoseVariabilityPer: glucose_variability_score.glucose_variability_per,
                date: reading_time
            };

            // Save final record
            const record = await new cgmCalculatedDataModel({
                userId: userId,
                ...newData
            });

            await StreakService.syncBloodGlucoseStreakData(userId, Date.now());

            return await record.save();

        } catch (error) {
            throw logError('processCGMData', error, { 
                userId, 
                reading_time,
                glucoseReading 
            });
        }
    }

}

module.exports = CgmService;