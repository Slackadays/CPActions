import * as fs from 'fs'
import * as architecture from './architecture'
import {getOrDefaultOrThrow} from './utility'
import * as vm from './vm'

export abstract class Vm extends vm.Vm {
  static readonly sshPort = 2847

  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    architecture: architecture.Architecture,
    configuration: vm.Configuration
  ) {
    super(
      hypervisorDirectory,
      resourcesDirectory,
      'qemu',
      architecture,
      configuration
    )
  }

  protected override async getIpAddress(): Promise<string> {
    return 'localhost'
  }

  override get command(): string[] {
    const accel = vm.Accelerator[this.configuration.accelerator]

    // prettier-ignore
    return [
      this.hypervisorPath.toString(),
      '-machine', `type=${this.configuration.machineType},accel=${accel}`,
      '-cpu', this.configuration.cpu,
      '-smp', this.configuration.cpuCount.toString(),
      '-m', this.configuration.memory,

      '-device', `${this.netDevive},netdev=user.0`,
      '-netdev', `user,id=user.0,hostfwd=tcp::${this.configuration.ssHostPort}-:22`,

      '-display', 'none',
      '-monitor', 'none',
      // '-nographic',

      '-boot', 'strict=off',
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      '-bios', this.configuration.firmware!.toString()
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    ].concat(this.hardDriverFlags)
  }

  protected abstract get hardDriverFlags(): string[]

  protected get defaultHardDriveFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-scsi-pci',

      '-device', 'scsi-hd,drive=drive0,bootindex=0',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=writeback,discard=ignore,format=raw`,

      '-device', 'scsi-hd,drive=drive1,bootindex=1',
      '-drive', `if=none,file=${this.configuration.resourcesDiskImage},id=drive1,cache=writeback,discard=ignore,format=raw`,
    ]
  }

  protected get netDevive(): string {
    return 'virtio-net'
  }
}

export function resolve<T>(implementation: Record<string, T>): T {
  return getOrDefaultOrThrow(implementation, 'qemu')
}
