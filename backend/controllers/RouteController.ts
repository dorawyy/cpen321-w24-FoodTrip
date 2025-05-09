import { NextFunction, Request, Response } from "express";
import {
  generateRouteStops,
  getRouteFromDb,
  saveRouteToDb,
  deleteRouteFromDb,
  fetchCityData,
} from "../helpers/RouteHelpers";
import { Location, Route, RouteRequest } from "../interfaces/RouteInterfaces";
import { ObjectId } from "mongodb";

// create a new route
// POST /routes
export const createRoute = async (
  req: Request<object, object, RouteRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    // validation of params performed by express-validator middleware
    const { userID, origin, destination, numStops }: RouteRequest = req.body;

    if (numStops < 1 || numStops > 10) {
      return res
        .status(400)
        .json({ error: "Number of stops must be between 1 and 10" });
    }

    const originCityData = await fetchCityData(origin);
    if (!originCityData) {
      return res.status(400).json({ error: "Origin city not found" });
    }

    const start: Location = {
      name: origin,
      latitude: parseFloat(originCityData.lat),
      longitude: parseFloat(originCityData.lon),
      population: 0, // not used for start location
    };

    const destinationCityData = await fetchCityData(destination);
    if (!destinationCityData) {
      return res.status(400).json({ error: "Destination city not found" });
    }

    const end: Location = {
      name: destination,
      latitude: parseFloat(destinationCityData.lat),
      longitude: parseFloat(destinationCityData.lon),
      population: 0, // not used for end location
    };

    if (start.latitude === end.latitude && start.longitude === end.longitude) {
      return res
        .status(400)
        .json({ error: "Origin and destination cannot be the same" });
    }

    const stops = await generateRouteStops(start, end, numStops);

    const route: Route = {
      start_location: {
        name: origin,
        latitude: start.latitude,
        longitude: start.longitude,
        population: 0, // not used for start location
      },
      end_location: {
        name: destination,
        latitude: end.latitude,
        longitude: end.longitude,
        population: 0, // not used for end location
      },
      stops,
    };

    const tripID = await saveRouteToDb(userID, route);
    const response = { tripID, ...route };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// get information about a particular route
// GET /routes/:id
export const getRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tripID = req.params.id;

    if (!ObjectId.isValid(tripID)) {
      return res.status(400).json({ error: "Invalid tripID format" });
    }

    const route = await getRouteFromDb(tripID);

    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    res.json(route);
  } catch (error) {
    next(error);
  }
};

// delete a route
// DELETE /routes/:id
export const deleteRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tripID = req.params.id;

    if (!ObjectId.isValid(tripID)) {
      return res.status(400).json({ error: "Invalid tripID format" });
    }

    const result = await deleteRouteFromDb(tripID);

    if (!result) {
      return res.status(404).json({ error: "Route not found" });
    }

    res.json({ success: true, message: "Route deleted successfully" });
  } catch (error) {
    next(error);
  }
};
