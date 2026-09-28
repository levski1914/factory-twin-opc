// opcua.service.ts
import { Injectable } from '@nestjs/common';
import {
  OPCUAClient,
  BrowseDirection,
  NodeClassMask,
  UserTokenType,
} from 'node-opcua';
import { AttributeIds } from 'node-opcua';
@Injectable()
export class OpcuaService {
  async testConnection(endpointUrl: string) {
    const client = OPCUAClient.create({
      endpointMustExist: false,
    });

    try {
      await client.connect(endpointUrl);
      await client.disconnect();

      return {
        ok: true,
        message: 'Connected to OPC UA server',
        endpointUrl,
      };
    } catch (error: any) {
      return {
        ok: false,
        message: error.message,
        endpointUrl,
      };
    }
  }

  async browse(
    endpointUrl: string,
    nodeId = 'RootFolder',
    userName?: string,
    password?: string,
  ) {
    const client = OPCUAClient.create({
      endpointMustExist: false,
    });

    await client.connect(endpointUrl);

    let session;
    if (userName && password) {
      session = await client.createSession({
        type: UserTokenType.UserName,
        userName,
        password,
      });
    } else {
      session = await client.createSession();
    }

    const references: any[] = [];

    const browseResult = await session.browse({
      nodeId,
      browseDirection: BrowseDirection.Forward,
      includeSubtypes: true,
      nodeClassMask: NodeClassMask.Object | NodeClassMask.Variable,
      resultMask: 0x3f,
    });

    references.push(...(browseResult.references ?? []));

    let continuationPoint = browseResult.continuationPoint;

    while (continuationPoint) {
      const nextResult = await session.browseNext(continuationPoint, false);

      references.push(...(nextResult.references ?? []));
      continuationPoint = nextResult.continuationPoint;
    }

    await session.close();
    await client.disconnect();

    return references.map((ref) => ({
      name: ref.browseName.toString(),
      nodeId: ref.nodeId.toString(),
      nodeClass: ref.nodeClass.toString(),
    }));
  }

  async readNode(endpointUrl: string, nodeId: string) {
    const client = OPCUAClient.create({
      endpointMustExist: false,
    });

    await client.connect(endpointUrl);
    const session = await client.createSession();

    const dataValue = await session.read({
      nodeId,
      attributeId: AttributeIds.Value,
    });

    await session.close();
    await client.disconnect();

    return {
      nodeId,
      value: dataValue.value.value,
      dataType: dataValue.value.dataType.toString(),
      statusCode: dataValue.statusCode.toString(),
    };
  }

  async readMotor(endpointUrl: string) {
    const tags = {
      current: 'ns=3;s="Server"."Motor_Current_A"',
      temperature: 'ns=3;s="Server"."Motor_Temp_C"',
      speed: 'ns=3;s="Server"."Motor_Speed_Pct"',
      load: 'ns=3;s="Server"."Motor_Load_PCT"',
      running: 'ns=3;s="Server"."Motor_Running"',
      highTemp: 'ns=3;s="Server"."Alarm_High_Temp"',
      highCurrent: 'ns=3;s="Server"."Alarm_HighCurrent"',
    };

    const result: Record<string, any> = {};

    for (const [key, nodeId] of Object.entries(tags)) {
      const data = await this.readNode(endpointUrl, nodeId);
      result[key] = data.value;
    }

    return {
      'motor-m101': {
        status: result.running ? 'RUNNING' : 'STOPPED',
        current: result.current,
        temperature: result.temperature,
        vibration: 0,
        speed: result.speed,
        load: result.load,
        voltage: 400,
        power: Number(((400 * result.current * 0.85) / 1000).toFixed(1)),
        runtime: 0,
        highTemp: result.highTemp,
        highCurrent: result.highCurrent,
      },
    };
  }
}
